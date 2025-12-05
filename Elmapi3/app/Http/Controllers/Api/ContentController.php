<?php

namespace App\Http\Controllers\Api;

use App\Models\Collection;
use Illuminate\Http\Request;
use App\Http\Resources\ContentEntryResource;
use App\Http\Controllers\Controller;
use App\Models\ContentEntry;
use App\Models\ContentFieldValue;
use Illuminate\Support\Facades\Hash;
use App\Http\Requests\ContentRequest;
use OpenApi\Annotations as OA;


class ContentController extends Controller
{
    /**
     * List published content entries for a collection.
     * Route: GET /api/{collection}
     * 
     * @OA\Get(
     *     path="/api/{collection}",
     *     summary="List content entries",
     *     description="Get content entries for a specific collection with filtering and pagination",
     *     tags={"Content"},
     *     security={{"bearerAuth": {}}},
     *     @OA\Parameter(
     *         name="project-id",
     *         in="header",
     *         required=true,
     *         description="Project identifier (UUID)",
     *         @OA\Schema(type="string", format="uuid", example="550e8400-e29b-41d4-a716-446655440000")
     *     ),
     *     @OA\Parameter(
     *         name="collection",
     *         in="path",
     *         required=true,
     *         description="Collection slug",
     *         @OA\Schema(type="string", example="blog-posts")
     *     ),
     *     @OA\Parameter(
     *         name="state",
     *         in="query",
     *         description="Filter by content state",
     *         @OA\Schema(type="string", enum={"only_draft", "with_draft"}, example="published")
     *     ),
     *     @OA\Parameter(
     *         name="locale",
     *         in="query",
     *         description="Filter by locale",
     *         @OA\Schema(type="string", example="en")
     *     ),
     *     @OA\Parameter(
     *         name="exclude",
     *         in="query",
     *         description="Comma-separated list of fields to exclude",
     *         @OA\Schema(type="string", example="content,excerpt")
     *     ),
     *     @OA\Parameter(
     *         name="where",
     *         in="query",
     *         description="Advanced filtering conditions",
     *         @OA\Schema(type="object")
     *     ),
     *     @OA\Parameter(
     *         name="order",
     *         in="query",
     *         description="Sorting order",
     *         @OA\Schema(type="string", example="created_at:desc")
     *     ),
     *     @OA\Parameter(
     *         name="limit",
     *         in="query",
     *         description="Number of items to return",
     *         @OA\Schema(type="integer", example=20)
     *     ),
     *     @OA\Parameter(
     *         name="offset",
     *         in="query",
     *         description="Number of items to skip",
     *         @OA\Schema(type="integer", example=0)
     *     ),
     *     @OA\Parameter(
     *         name="timestamps",
     *         in="query",
     *         description="Include created_at and updated_at timestamps",
     *         @OA\Schema(type="boolean", example=true)
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Content entries retrieved successfully",
     *         @OA\JsonContent(
     *             type="array",
     *             @OA\Items(
     *                 type="object",
     *                 @OA\Property(property="uuid", type="string", example="550e8400-e29b-41d4-a716-446655440000"),
     *                 @OA\Property(property="locale", type="string", example="en"),
     *                 @OA\Property(property="published_at", type="string", format="date-time"),
     *                 @OA\Property(property="fields", type="object", example={"title": "My Post", "content": "Post content"}),
     *                 @OA\Property(property="created_at", type="string", format="date-time"),
     *                 @OA\Property(property="updated_at", type="string", format="date-time")
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthorized - Invalid or missing API token"
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="Forbidden - API token doesn't have required permissions"
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Collection not found"
     *     )
     * )
     */
    public function index(Request $request, string $collection)
    {
        $project = $request->attributes->get('project');

        // Find collection within project
        $collection = Collection::where('project_id', $project->id)
            ->where('slug', $collection)
            ->first();

        if (!$collection) {
            return response()->json(['message' => 'Collection not found.'], 404);
        }

        // Base query
        $query = $collection->contentEntries();

        // Draft / published state handling
        $state = $request->query('state');
        if ($state === 'only_draft') {
            $query->where('status', 'draft');
        } elseif ($state === 'with_draft') {
            // no filter – include both
        } else {
            $query->where('status', 'published');
        }

        // Optional locale filter
        if ($locale = $request->query('locale')) {
            $query->where('locale', $locale);
        }

        // Optional field exclusion
        $excludeFields = $request->query('exclude');
        if ($excludeFields) {
            $excludeArray = is_array($excludeFields) ? $excludeFields : explode(',', $excludeFields);
            $excludeArray = array_map('trim', $excludeArray);
        }

        // Advanced where clauses
        if (is_array($request->query('where'))) {
            $coreColumns = ['id','uuid','locale','status','created_at','updated_at','published_at'];

            $applyCondition = function($boolean, $col, $operator, $val, $builder = null) use (&$query, $coreColumns, $collection) {
                $builder = $builder ?? $query;
                $opMap = [
                    'eq' => '=',
                    'lt' => '<',
                    'lte' => '<=',
                    'gt' => '>',
                    'gte' => '>=',
                    'not' => '!=',
                ];

                $operator = strtolower($operator);

                // Core columns
                if (in_array($col, $coreColumns)) {
                    if ($operator === 'in' || $operator === 'not_in') {
                        $method = $operator === 'in' ? ($boolean==='or'?'orWhereIn':'whereIn') : ($boolean==='or'?'orWhereNotIn':'whereNotIn');
                        $builder->{$method}($col, is_array($val)?$val:explode(',',$val));
                    } elseif ($operator === 'null' || $operator === 'not_null') {
                        $method = $operator === 'null' ? ($boolean==='or'?'orWhereNull':'whereNull') : ($boolean==='or'?'orWhereNotNull':'whereNotNull');
                        $builder->{$method}($col);
                    } elseif ($operator === 'between' || $operator === 'not_between') {
                        $vals = is_array($val)?$val:explode(',',$val);
                        $method = $operator === 'between' ? ($boolean==='or'?'orWhereBetween':'whereBetween') : ($boolean==='or'?'orWhereNotBetween':'whereNotBetween');
                        $builder->{$method}($col, $vals);
                    } elseif ($operator === 'like') {
                        $builder->{$boolean==='or'?'orWhere':'where'}($col, 'like', "%$val%");
                    } else { // eq, lt, etc.
                        $symbol = $opMap[$operator] ?? '=';
                        $builder->{$boolean==='or'?'orWhere':'where'}($col, $symbol, $val);
                    }
                } else {
                    // Custom field value with operator handling

                    // Special-case NOT operator first to avoid null-comparison pitfalls
                    if ($operator === 'not') {
                        $doesntHave = function($q) use ($col, $val) {
                            $q->whereHas('field', fn($f) => $f->where('name', $col))
                              ->where(function ($inner) use ($val) {
                                  $inner->where('text_value', $val)
                                        ->orWhereJsonContains('json_value', $val);
                              });
                        };

                        if ($boolean === 'or') {
                            // wrap in orWhere to mimic "orDoesntHave"
                            $builder->orWhere(function ($sub) use ($doesntHave) {
                                $sub->whereDoesntHave('fieldValues', $doesntHave);
                            });
                        } else {
                            $builder->whereDoesntHave('fieldValues', $doesntHave);
                        }

                        return; // done for NOT case
                    }

                    // Check if this is a relation field by looking for relation field types
                    $field = \App\Models\Field::where('name', $col)->where('collection_id', $collection->id)->first();
                    $isRelationField = $field && in_array($field->type, ['relation', 'media']);

                    if ($isRelationField && in_array($operator, ['null', 'not_null'])) {
                        // Handle null/not_null for relation fields
                        if ($operator === 'null') {
                            if ($boolean === 'or') {
                                $builder->orWhere(function($q) use ($col) {
                                    // Either doesn't have the field value at all
                                    $q->whereDoesntHave('fieldValues', function($subQ) use ($col) {
                                        $subQ->whereHas('field', fn($f) => $f->where('name', $col));
                                    });
                                    // Or has the field value but no relations
                                    $q->orWhereHas('fieldValues', function($subQ) use ($col) {
                                        $subQ->whereHas('field', fn($f) => $f->where('name', $col))
                                             ->whereDoesntHave('valueRelations');
                                    });
                                });
                            } else {
                                $builder->where(function($q) use ($col) {
                                    // Either doesn't have the field value at all
                                    $q->whereDoesntHave('fieldValues', function($subQ) use ($col) {
                                        $subQ->whereHas('field', fn($f) => $f->where('name', $col));
                                    });
                                    // Or has the field value but no relations
                                    $q->orWhereHas('fieldValues', function($subQ) use ($col) {
                                        $subQ->whereHas('field', fn($f) => $f->where('name', $col))
                                             ->whereDoesntHave('valueRelations');
                                    });
                                });
                            }
                        } else { // not_null
                            if ($boolean === 'or') {
                                $builder->orWhereHas('fieldValues', function($q) use ($col) {
                                    $q->whereHas('field', fn($f) => $f->where('name', $col))
                                      ->whereHas('valueRelations');
                                });
                            } else {
                                $builder->whereHas('fieldValues', function($q) use ($col) {
                                    $q->whereHas('field', fn($f) => $f->where('name', $col))
                                      ->whereHas('valueRelations');
                                });
                            }
                        }
                    } else {
                        // All other operators handled via whereHas
                        $builder->{$boolean === 'or' ? 'orWhereHas' : 'whereHas'}('fieldValues', function ($q) use ($col, $operator, $val, $opMap) {
                            $q->whereHas('field', fn($f) => $f->where('name', $col));

                            $applyBasic = function ($q3, $comp, $v) {
                                $q3->where(function ($inner) use ($comp, $v) {
                                    // Always compare against text & json values
                                    $inner->where('text_value', $comp, $comp === 'like' ? "%$v%" : $v)
                                          ->orWhereJsonContains('json_value', $v);

                                    // Only compare against number_value when the incoming value is truly numeric
                                    if (is_numeric($v)) {
                                        $inner->orWhere('number_value', $comp, $v);
                                    }

                                    // Only compare against boolean_value when the incoming value can be evaluated as boolean
                                    $booleanMap = ['true' => true, 'false' => false, '1' => true, '0' => false];
                                    $vLower = is_string($v) ? strtolower($v) : $v;
                                    if (isset($booleanMap[$vLower])) {
                                        $inner->orWhere('boolean_value', $comp, $booleanMap[$vLower]);
                                    }
                                });
                            };

                            switch ($operator) {
                                case 'like':
                                    $applyBasic($q, 'like', $val);
                                    break;
                                case 'lt':
                                case 'lte':
                                case 'gt':
                                case 'gte':
                                    $symbol = $opMap[$operator];
                                    $applyBasic($q, $symbol, $val);
                                    break;
                                case 'in':
                                case 'not_in':
                                    $vals = is_array($val) ? $val : explode(',', $val);
                                    $q->where(function ($inner) use ($vals, $operator) {
                                        foreach ($vals as $v) {
                                            $inner->{$operator === 'in' ? 'orWhere' : 'where'}('text_value', $operator === 'in' ? '=' : '!=', $v)
                                                  ->orWhereJsonContains('json_value', $v);
                                        }
                                    });
                                    break;
                                case 'between':
                                case 'not_between':
                                    $vals = is_array($val) ? $val : explode(',', $val);
                                    if (count($vals) >= 2) {
                                        [$min, $max] = $vals;
                                        $method = $operator === 'between' ? 'whereBetween' : 'whereNotBetween';
                                        $q->where(function ($inner) use ($min, $max, $method) {
                                            // Only apply numeric between on number_value if both bounds are numeric
                                            if (is_numeric($min) && is_numeric($max)) {
                                                $inner->{$method}('number_value', [$min, $max]);
                                            }
                                            // Always allow text range check as fallback
                                            $inner->orWhere(function ($txt) use ($min, $max, $method) {
                                                $txt->{$method}('text_value', [$min, $max]);
                                            });
                                        });
                                    }
                                    break;
                                case 'null':
                                    $q->where(function ($inner) {
                                        $inner->whereNull('text_value')
                                              ->whereNull('number_value')
                                              ->whereNull('boolean_value')
                                              ->whereNull('date_value')
                                              ->whereNull('datetime_value')
                                              ->whereNull('json_value');
                                    });
                                    break;
                                case 'not_null':
                                    $q->where(function ($inner) {
                                        $inner->whereNotNull('text_value')
                                              ->orWhereNotNull('number_value')
                                              ->orWhereNotNull('boolean_value')
                                              ->orWhereNotNull('date_value')
                                              ->orWhereNotNull('datetime_value')
                                              ->orWhereNotNull('json_value');
                                    });
                                    break;
                                default: // eq etc.
                                    $applyBasic($q, '=', $val);
                            }
                        });
                    }
                }
            };

            $whereParams = $request->query('where');

            // handle OR group
            $orGroup = $whereParams['or'] ?? [];
            unset($whereParams['or']);

            foreach ($whereParams as $field => $cond) {
                // Support for array-style grouping e.g. where[][tags]=News which gives numeric keys
                if (is_numeric($field)) {
                    foreach ($cond as $nestedField => $nestedCond) {
                        if (is_array($nestedCond)) {
                            $operatorKeys = ['eq','lt','lte','gt','gte','not','like','in','not_in','null','not_null','between','not_between'];
                            $firstKey = array_key_first($nestedCond);
                            if (in_array(strtolower($firstKey), $operatorKeys)) {
                                foreach ($nestedCond as $op=>$value) {
                                    $applyCondition('and',$nestedField,$op,$value);
                                }
                            } else {
                                // relation style nested under numeric key
                                foreach ($nestedCond as $subField=>$subVal) {
                                    if (is_array($subVal)) {
                                        foreach ($subVal as $op=>$val) {
                                            $query->whereHas('fieldValues', function($q) use ($nestedField,$subField,$op,$val,$applyCondition,$coreColumns) {
                                                $q->whereHas('field', fn($f)=>$f->where('name',$nestedField))
                                                  ->whereHas('valueRelations.related', function($relQ) use ($subField,$op,$val,$applyCondition,$coreColumns){
                                                        $applyCondition('and',$subField,$op,$val,$relQ);
                                                  });
                                            });
                                        }
                                    } else {
                                        $query->whereHas('fieldValues', function($q) use ($nestedField,$subField,$subVal,$applyCondition,$coreColumns){
                                            $q->whereHas('field', fn($f)=>$f->where('name',$nestedField))
                                              ->whereHas('valueRelations.related', function($relQ) use ($subField,$subVal,$applyCondition,$coreColumns){
                                                    $applyCondition('and',$subField,'eq',$subVal,$relQ);
                                              });
                                        });
                                    }
                                }
                            }
                        } else {
                            $applyCondition('and',$nestedField,'eq',$nestedCond);
                        }
                    }
                    continue; // move to next top-level where param
                }

                if (is_array($cond)) {
                    $operatorKeys = ['eq','lt','lte','gt','gte','not','like','in','not_in','null','not_null','between','not_between'];
                    $firstKey = array_key_first($cond);
                    if (in_array(strtolower($firstKey), $operatorKeys)) {
                        foreach ($cond as $op=>$value) {
                            $applyCondition('and',$field,$op,$value);
                        }
                    } else {
                        // treat as relation filter
                        foreach ($cond as $subField=>$subVal) {
                            if (is_array($subVal)) {
                                foreach ($subVal as $op=>$val) {
                                    $query->whereHas('fieldValues', function($q) use ($field,$subField,$op,$val,$applyCondition,$coreColumns) {
                                        $q->whereHas('field', fn($f)=>$f->where('name',$field))
                                          ->whereHas('valueRelations.related', function($relQ) use ($subField,$op,$val,$applyCondition,$coreColumns){
                                                $applyCondition('and',$subField,$op,$val,$relQ);
                                          });
                                    });
                                }
                            } else {
                                $query->whereHas('fieldValues', function($q) use ($field,$subField,$subVal,$applyCondition,$coreColumns){
                                    $q->whereHas('field', fn($f)=>$f->where('name',$field))
                                      ->whereHas('valueRelations.related', function($relQ) use ($subField,$subVal,$applyCondition,$coreColumns){
                                            $applyCondition('and',$subField,'eq',$subVal,$relQ);
                                      });
                                });
                            }
                        }
                    }
                } else {
                    $applyCondition('and',$field,'eq',$cond);
                }
            }

            // Handle OR group - wrap all OR conditions in a single where clause
            if (!empty($orGroup)) {
                $query->where(function($orQuery) use ($orGroup, $applyCondition, $coreColumns) {
                    foreach ($orGroup as $field => $cond) {
                        if (is_numeric($field)) {
                            foreach ($cond as $nestedField => $nestedCond) {
                                if (is_array($nestedCond)) {
                                    $operatorKeys = ['eq','lt','lte','gt','gte','not','like','in','not_in','null','not_null','between','not_between'];
                                    $firstKey = array_key_first($nestedCond);
                                    if (in_array(strtolower($firstKey), $operatorKeys)) {
                                        foreach ($nestedCond as $op=>$value) {
                                            $applyCondition('or',$nestedField,$op,$value,$orQuery);
                                        }
                                    } else {
                                        foreach ($nestedCond as $subField=>$subVal) {
                                            if (is_array($subVal)) {
                                                foreach ($subVal as $op=>$val) {
                                                    $orQuery->orWhere(function($outer) use ($nestedField,$subField,$op,$val,$applyCondition,$coreColumns){
                                                        $outer->whereHas('fieldValues', function($q) use ($nestedField,$subField,$op,$val,$applyCondition,$coreColumns){
                                                            $q->whereHas('field', fn($f)=>$f->where('name',$nestedField))
                                                              ->whereHas('valueRelations.related', function($relQ) use ($subField,$op,$val,$applyCondition,$coreColumns){
                                                                    $applyCondition('and',$subField,$op,$val,$relQ);
                                                              });
                                                        });
                                                    });
                                                }
                                            } else {
                                                $orQuery->orWhere(function($outer) use ($nestedField,$subField,$subVal,$applyCondition,$coreColumns){
                                                    $outer->whereHas('fieldValues', function($q) use ($nestedField,$subField,$subVal,$applyCondition,$coreColumns){
                                                        $q->whereHas('field', fn($f)=>$f->where('name',$nestedField))
                                                          ->whereHas('valueRelations.related', function($relQ) use ($subField,$subVal,$applyCondition,$coreColumns){
                                                                $applyCondition('and',$subField,'eq',$subVal,$relQ);
                                                          });
                                                    });
                                                });
                                            }
                                        }
                                    }
                                } else {
                                    $applyCondition('or',$nestedField,'eq',$nestedCond,$orQuery);
                                }
                            }
                            continue;
                        }
                        if (is_array($cond)) {
                            $operatorKeys = ['eq','lt','lte','gt','gte','not','like','in','not_in','null','not_null','between','not_between'];
                            $firstKey = array_key_first($cond);
                            if (in_array(strtolower($firstKey), $operatorKeys)) {
                                foreach ($cond as $op=>$value) {
                                    $applyCondition('or',$field,$op,$value,$orQuery);
                                }
                            } else {
                                // treat as relation filter
                                foreach ($cond as $subField=>$subVal) {
                                    if (is_array($subVal)) {
                                        foreach ($subVal as $op=>$val) {
                                            $orQuery->orWhere(function($outer) use ($field,$subField,$op,$val,$applyCondition,$coreColumns) {
                                                $outer->whereHas('fieldValues', function($q) use ($field,$subField,$op,$val,$applyCondition,$coreColumns){
                                                    $q->whereHas('field', fn($f)=>$f->where('name',$field))
                                                      ->whereHas('valueRelations.related', function($relQ) use ($subField,$op,$val,$applyCondition,$coreColumns){
                                                            $applyCondition('and',$subField,$op,$val,$relQ);
                                                      });
                                                });
                                            });
                                        }
                                    } else {
                                        $orQuery->orWhere(function($outer) use ($field,$subField,$subVal,$applyCondition,$coreColumns){
                                            $outer->whereHas('fieldValues', function($q) use ($field,$subField,$subVal,$applyCondition,$coreColumns){
                                                $q->whereHas('field', fn($f)=>$f->where('name',$field))
                                                  ->whereHas('valueRelations.related', function($relQ) use ($subField,$subVal,$applyCondition,$coreColumns){
                                                        $applyCondition('and',$subField,'eq',$subVal,$relQ);
                                                  });
                                            });
                                        });
                                    }
                                }
                            }
                        } else {
                            $applyCondition('or',$field,'eq',$cond,$orQuery);
                        }
                    }
                });
            }
        }

        // Singleton collection shortcut: return single entry object instead of list
        if ($collection->is_singleton) {
            $entry = $query->with([
                'fieldValues.field',
                'fieldValues.mediaRelations.asset.metadata',
                'fieldValues.valueRelations.related',
                'fieldGroups.field',
                'fieldGroups.fieldValues.field',
                'fieldGroups.fieldValues.mediaRelations.asset.metadata',
                'fieldGroups.fieldValues.valueRelations.related',
            ])->first();

            if (!$entry) {
                return response()->json(['message' => 'Content not found.'], 404);
            }

            return new ContentEntryResource($entry);
        }

        // Pagination-like limit & offset (ignored if paginate param provided)
        $paginate = (int) $request->query('paginate');
        if (!$paginate) {
            if ($limit = (int) $request->query('limit')) {
                $query->limit($limit);
            }
            if ($offset = (int) $request->query('offset')) {
                //if limit is not set, skip offset
                if($limit){
                    $query->offset($offset);
                }
            }
        }

        // Sorting
        $sortParam = $request->query('sort');
        if ($sortParam) {
            $parts = explode(',', $sortParam);
            foreach ($parts as $part) {
                [$col, $dir] = array_pad(explode(':', $part), 2, 'ASC');
                $dir = strtoupper($dir) === 'DESC' ? 'DESC' : 'ASC';
                if (in_array($col, ['id','created_at','updated_at','published_at'])) {
                    $query->orderBy($col, $dir);
                } elseif ($paginate) {
                    // For field-based sorting with pagination, we need database-level sorting
                    // Find the field by name (ensure fields are loaded)
                    if (!$collection->relationLoaded('fields')) {
                        $collection->load('fields');
                    }
                    $sortField = $collection->fields->firstWhere('name', $col);
                    
                    if ($sortField) {
                        $alias = 'sort_value_' . $col;
                        
                        // Check if we've already selected columns (to avoid overwriting)
                        $hasSelect = !empty($query->getQuery()->columns);
                        
                        // Ensure we only join once per field
                        $query->leftJoin("content_field_values as {$alias}", function ($join) use ($alias, $sortField) {
                            $join->on("{$alias}.content_entry_id", '=', 'content_entries.id')
                                 ->where("{$alias}.field_id", '=', $sortField->id);
                        });
                        
                        // Select base columns to avoid ambiguous field list (only if no selects exist)
                        if (!$hasSelect) {
                            $query->select('content_entries.*');
                        }
                        
                        // Determine which column to sort on based on field type
                        switch ($sortField->type) {
                            case 'number':
                                $valueColumn = "{$alias}.number_value";
                                break;
                            case 'boolean':
                                $valueColumn = "{$alias}.boolean_value";
                                break;
                            case 'date':
                            case 'datetime':
                                $valueColumn = "{$alias}.date_value";
                                break;
                            default:
                                $valueColumn = "{$alias}.text_value";
                        }
                        
                        // MySQL doesn't support NULLS LAST; emulate by sorting nulls after non-null values
                        // First sort by whether the value is NULL, then by the actual value
                        $query->orderByRaw("ISNULL({$valueColumn}) ASC");
                        // Order by the value column
                        $query->orderByRaw("{$valueColumn} {$dir}");
                    }
                }
            }
        } else {
            $query->orderBy('id', 'desc');
        }

        // Count shortcut
        if ($request->has('count')) {
            if($limit = (int) $request->query('limit')){
                if($offset = (int) $request->query('offset')){
                    $count = $query->limit($limit)->offset($offset)->get()->count();
                } else {
                    $count = $query->limit($limit)->get()->count();
                }
            } else {
                $count = $query->count();
            }
            return response()->json(['count' => $count]);
        }

        $with = [
            'fieldValues.field',
            'fieldValues.mediaRelations.asset.metadata',
            'fieldValues.valueRelations.related',
            'fieldGroups.field',
            'fieldGroups.fieldValues.field',
            'fieldGroups.fieldValues.mediaRelations.asset.metadata',
            'fieldGroups.fieldValues.valueRelations.related',
        ];

        // Apply field exclusion if specified
        if (!empty($excludeArray)) {
            $with['fieldValues'] = function ($query) use ($excludeArray) {
                $query->whereHas('field', function ($fieldQuery) use ($excludeArray) {
                    $fieldQuery->whereNotIn('name', $excludeArray);
                });
            };
        }

        if ($paginate) {
            $entries = $query->with($with)->paginate($paginate)->appends($request->query());
            return ContentEntryResource::collection($entries);
        }

        if($request->has('first')){
            $entries = $query->with($with)->first();
        } else {
            $entries = $query->with($with)->get();
        }

        // If sort requested on a non-column, attempt field-based sort (only supports single field for now)
        if ($sortParam) {
            $firstPart = explode(',', $sortParam)[0];
            [$col, $dir] = array_pad(explode(':', $firstPart), 2, 'ASC');
            $dir = strtoupper($dir) === 'DESC' ? 'DESC' : 'ASC';

            if (!in_array($col, ['id','created_at','updated_at','published_at'])) {
                // Sort in memory using field value (text_value or number_value etc.)
                $entries = $entries->sortBy(function ($entry) use ($col) {
                    $val = $entry->fieldValues->firstWhere(fn($fv) => $fv->field && $fv->field->name === $col);
                    if (!$val) return null;
                    return $val->text_value ?? $val->number_value ?? $val->boolean_value ?? $val->date_value ?? $val->datetime_value ?? null;
                }, SORT_REGULAR, $dir === 'DESC');
            }
        }

        if($request->has('first')){
            return new ContentEntryResource($entries);
        }
        return ContentEntryResource::collection($entries);
    }

    /**
     * Display a single content entry by UUID
     * Route: GET /api/{collection}/{uuid}
     * 
     * @OA\Get(
     *     path="/api/{collection}/{uuid}",
     *     summary="Get content entry",
     *     description="Retrieve a specific content entry by its UUID",
     *     tags={"Content"},
     *     security={{"bearerAuth": {}}},
     *     @OA\Parameter(
     *         name="project-id",
     *         in="header",
     *         required=true,
     *         description="Project identifier (UUID)",
     *         @OA\Schema(type="string", format="uuid", example="550e8400-e29b-41d4-a716-446655440000")
     *     ),
     *     @OA\Parameter(
     *         name="collection",
     *         in="path",
     *         required=true,
     *         description="Collection slug",
     *         @OA\Schema(type="string", example="blog-posts")
     *     ),
     *     @OA\Parameter(
     *         name="uuid",
     *         in="path",
     *         required=true,
     *         description="Content entry UUID",
     *         @OA\Schema(type="string", example="550e8400-e29b-41d4-a716-446655440000")
     *     ),
     *     @OA\Parameter(
     *         name="translation_locale",
     *         in="query",
     *         required=false,
     *         description="Get translation of this entry in the specified locale. Returns the linked translation entry instead of the original.",
     *         @OA\Schema(type="string", example="fr")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Content entry retrieved successfully",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="data", type="object",
     *                 @OA\Property(property="id", type="integer", example=1),
     *                 @OA\Property(property="uuid", type="string", example="550e8400-e29b-41d4-a716-446655440000"),
     *                 @OA\Property(property="locale", type="string", example="en"),
     *                 @OA\Property(property="status", type="string", example="published"),
     *                 @OA\Property(property="published_at", type="string", format="date-time"),
     *                 @OA\Property(property="created_at", type="string", format="date-time"),
     *                 @OA\Property(property="updated_at", type="string", format="date-time"),
     *                 @OA\Property(property="fields", type="object", example={"title": "My Post", "content": "Post content"})
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthorized - Invalid or missing API token"
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="Forbidden - API token doesn't have required permissions"
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Content entry not found"
     *     )
     * )
     */
    public function show(Request $request, string $collection, string $uuid)
    {
        $project = $request->attributes->get('project');

        $collectionModel = Collection::where('project_id', $project->id)
            ->where('slug', $collection)
            ->first();

        if (!$collectionModel) {
            return response()->json(['message' => 'Collection not found.'], 404);
        }

        $entryQuery = $collectionModel->contentEntries()->where('uuid', $uuid);

        // Draft / published state handling (same semantics as list)
        $state = $request->query('state');
        if ($state === 'only_draft') {
            $entryQuery->where('status', 'draft');
        } elseif ($state === 'with_draft') {
            // include both
        } else {
            $entryQuery->where('status', 'published');
        }

        // Optional locale filter
        if ($locale = $request->query('locale')) {
            $entryQuery->where('locale', $locale);
        }

        $with = [
            'fieldValues.field',
            'fieldValues.mediaRelations.asset.metadata',
            'fieldValues.valueRelations.related',
            'fieldGroups.field',
            'fieldGroups.fieldValues.field',
            'fieldGroups.fieldValues.mediaRelations.asset.metadata',
            'fieldGroups.fieldValues.valueRelations.related',
        ];

        // Apply field exclusion if specified
        $excludeFields = $request->query('exclude');
        if ($excludeFields) {
            $excludeArray = is_array($excludeFields) ? $excludeFields : explode(',', $excludeFields);
            $excludeArray = array_map('trim', $excludeArray);
            
            $with['fieldValues'] = function ($query) use ($excludeArray) {
                $query->whereHas('field', function ($fieldQuery) use ($excludeArray) {
                    $fieldQuery->whereNotIn('name', $excludeArray);
                });
            };
        }

        $entry = $entryQuery->with($with)->first();

        if (!$entry) {
            return response()->json(['message' => 'Content not found.'], 404);
        }

        // If translation_locale is requested, find the translation
        if ($translationLocale = $request->query('translation_locale')) {
            if ($entry->translation_group_id) {
                // Find the translation entry in the requested locale
                $translationQuery = $collectionModel->contentEntries()
                    ->where('translation_group_id', $entry->translation_group_id)
                    ->where('locale', $translationLocale)
                    ->where('id', '!=', $entry->id);

                // Apply same state filter as original query
                if ($state === 'only_draft') {
                    $translationQuery->where('status', 'draft');
                } elseif ($state === 'with_draft') {
                    // include both
                } else {
                    $translationQuery->where('status', 'published');
                }

                $translationEntry = $translationQuery->with($with)->first();

                if ($translationEntry) {
                    return new ContentEntryResource($translationEntry);
                } else {
                    // Translation not found - return 404 with helpful message
                    return response()->json([
                        'message' => "Translation not found for locale '{$translationLocale}'."
                    ], 404);
                }
            } else {
                // Entry has no translation group
                return response()->json([
                    'message' => "This entry has no translations linked."
                ], 404);
            }
        }

        return new ContentEntryResource($entry);
    }

    /**
     * Create a new content entry within a collection
     * Route: POST /api/{collection}
     * 
     * @OA\Post(
     *     path="/api/{collection}",
     *     summary="Create content entry",
     *     description="Create a new content entry in the specified collection",
     *     tags={"Content"},
     *     security={{"bearerAuth": {}}},
     *     @OA\Parameter(
     *         name="project-id",
     *         in="header",
     *         required=true,
     *         description="Project identifier (UUID)",
     *         @OA\Schema(type="string", format="uuid", example="550e8400-e29b-41d4-a716-446655440000")
     *     ),
     *     @OA\Parameter(
     *         name="collection",
     *         in="path",
     *         required=true,
     *         description="Collection slug",
     *         @OA\Schema(type="string", example="blog-posts")
     *     ),
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="locale", type="string", example="en"),
     *             @OA\Property(property="status", type="string", enum={"draft", "published"}, example="draft"),
     *             @OA\Property(property="published_at", type="string", format="date-time"),
     *             @OA\Property(property="data", type="object", example={"title": "My Post", "content": "Post content"})
     *         )
     *     ),
     *     @OA\Response(
     *         response=201,
     *         description="Content entry created successfully",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="data", type="object",
     *                 @OA\Property(property="id", type="integer", example=1),
     *                 @OA\Property(property="uuid", type="string", example="550e8400-e29b-41d4-a716-446655440000"),
     *                 @OA\Property(property="locale", type="string", example="en"),
     *                 @OA\Property(property="status", type="string", example="draft"),
     *                 @OA\Property(property="published_at", type="string", format="date-time"),
     *                 @OA\Property(property="created_at", type="string", format="date-time"),
     *                 @OA\Property(property="updated_at", type="string", format="date-time"),
     *                 @OA\Property(property="fields", type="object", example={"title": "My Post", "content": "Post content"})
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=400,
     *         description="Bad request - Validation error"
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthorized - Invalid or missing API token"
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="Forbidden - API token doesn't have required permissions"
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Collection not found"
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Unprocessable entity - Singleton collection already has entry"
     *     )
     * )
     */
    public function store(ContentRequest $request, string $collection)
    {
        // Require sanctum token with create ability
        if (!auth('sanctum')->user() || !auth('sanctum')->user()->tokenCan('create')) {
            return response()->json(['message' => 'API token doesn\'t have the right abilities!'], 403);
        }

        $project = $request->attributes->get('project');

        // Locate collection by slug inside project
        $collectionModel = Collection::where('project_id', $project->id)
            ->where('slug', $collection)
            ->with('fields.children')
            ->first();

        if (!$collectionModel) {
            return response()->json(['message' => 'Collection not found.'], 404);
        }

        // Enforce single-entry rule for singleton collections
        if ($collectionModel->is_singleton) {
            $existingQuery = $collectionModel->contentEntries();
            // If request specifies locale, limit by that locale
            if ($request->filled('locale')) {
                $existingQuery->where('locale', $request->input('locale'));
            }

            if ($existingQuery->exists()) {
                return response()->json([
                    'message' => 'This collection is a singleton and already has an entry.'
                ], 422);
            }
        }

        // Validate and normalise basic params
        $status = $request->input('status', 'draft');
        if (!in_array($status, ['draft', 'published'])) {
            $status = 'draft';
        }

        $locale = $request->input('locale');

        // Create content entry
        $entry = new ContentEntry([
            'project_id'  => $project->id,
            'collection_id' => $collectionModel->id,
            'locale'      => $locale,
            'status'      => $status,
        ]);

        if ($status === 'published') {
            $entry->published_at = now();
        }

        $entry->save();

        // Persist field values
        $fieldData = $request->input('data', []);

        foreach ($fieldData as $fieldName => $value) {
            $field = $collectionModel->fields->firstWhere('name', $fieldName);
            if (!$field) {
                continue; // ignore unknown field
            }

            // Handle field groups
            if ($field->type === 'group') {
                $this->saveFieldGroup($entry, $field, $value);
            }
            // Handle repeatable fields
            elseif (isset($field->options['repeatable']) && $field->options['repeatable'] && is_array($value)) {
                foreach ($value as $item) {
                    $this->saveFieldValue($entry, $field, $item['value'] ?? null);
                }
            } else {
                $this->saveFieldValue($entry, $field, $value);
            }
        }

        // Reload with relations for the resource output
        $entry->load([
            'fieldValues.field',
            'fieldValues.mediaRelations.asset.metadata',
            'fieldValues.valueRelations.related',
            'fieldGroups.field',
            'fieldGroups.fieldValues.field',
            'fieldGroups.fieldValues.mediaRelations.asset.metadata',
            'fieldGroups.fieldValues.valueRelations.related',
        ]);

        return (new ContentEntryResource($entry))
                    ->response()
                    ->setStatusCode(201);
    }

    /**
     * Update an existing content entry
     * Route: PUT/PATCH /api/{collection}/{uuid}
     * 
     * @OA\Put(
     *     path="/api/{collection}/{uuid}",
     *     summary="Update content entry",
     *     description="Update an existing content entry in the specified collection",
     *     tags={"Content"},
     *     security={{"bearerAuth": {}}},
     *     @OA\Parameter(
     *         name="project-id",
     *         in="header",
     *         required=true,
     *         description="Project identifier (UUID)",
     *         @OA\Schema(type="string", format="uuid", example="550e8400-e29b-41d4-a716-446655440000")
     *     ),
     *     @OA\Parameter(
     *         name="collection",
     *         in="path",
     *         required=true,
     *         description="Collection slug",
     *         @OA\Schema(type="string", example="blog-posts")
     *     ),
     *     @OA\Parameter(
     *         name="uuid",
     *         in="path",
     *         required=true,
     *         description="Content entry UUID",
     *         @OA\Schema(type="string", example="550e8400-e29b-41d4-a716-446655440000")
     *     ),
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="locale", type="string", example="en"),
     *             @OA\Property(property="status", type="string", enum={"draft", "published"}, example="draft"),
     *             @OA\Property(property="published_at", type="string", format="date-time"),
     *             @OA\Property(property="data", type="object", example={"title": "My Post", "content": "Post content"})
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Content entry updated successfully",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="data", type="object",
     *                 @OA\Property(property="id", type="integer", example=1),
     *                 @OA\Property(property="uuid", type="string", example="550e8400-e29b-41d4-a716-446655440000"),
     *                 @OA\Property(property="locale", type="string", example="en"),
     *                 @OA\Property(property="status", type="string", example="draft"),
     *                 @OA\Property(property="published_at", type="string", format="date-time"),
     *                 @OA\Property(property="created_at", type="string", format="date-time"),
     *                 @OA\Property(property="updated_at", type="string", format="date-time"),
     *                 @OA\Property(property="fields", type="object", example={"title": "My Post", "content": "Post content"})
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=400,
     *         description="Bad request - Validation error"
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthorized - Invalid or missing API token"
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="Forbidden - API token doesn't have required permissions"
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Content entry or collection not found"
     *     )
     * )
     * 
     * @OA\Patch(
     *     path="/api/{collection}/{uuid}",
     *     summary="Update content entry",
     *     description="Update an existing content entry in the specified collection",
     *     tags={"Content"},
     *     security={{"bearerAuth": {}}},
     *     @OA\Parameter(
     *         name="project-id",
     *         in="header",
     *         required=true,
     *         description="Project identifier (UUID)",
     *         @OA\Schema(type="string", format="uuid", example="550e8400-e29b-41d4-a716-446655440000")
     *     ),
     *     @OA\Parameter(
     *         name="collection",
     *         in="path",
     *         required=true,
     *         description="Collection slug",
     *         @OA\Schema(type="string", example="blog-posts")
     *     ),
     *     @OA\Parameter(
     *         name="uuid",
     *         in="path",
     *         required=true,
     *         description="Content entry UUID",
     *         @OA\Schema(type="string", example="550e8400-e29b-41d4-a716-446655440000")
     *     ),
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="locale", type="string", example="en"),
     *             @OA\Property(property="status", type="string", enum={"draft", "published"}, example="draft"),
     *             @OA\Property(property="published_at", type="string", format="date-time"),
     *             @OA\Property(property="data", type="object", example={"title": "My Post", "content": "Post content"})
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Content entry updated successfully",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="data", type="object",
     *                 @OA\Property(property="id", type="integer", example=1),
     *                 @OA\Property(property="uuid", type="string", example="550e8400-e29b-41d4-a716-446655440000"),
     *                 @OA\Property(property="locale", type="string", example="en"),
     *                 @OA\Property(property="status", type="string", example="draft"),
     *                 @OA\Property(property="published_at", type="string", format="date-time"),
     *                 @OA\Property(property="created_at", type="string", format="date-time"),
     *                 @OA\Property(property="updated_at", type="string", format="date-time"),
     *                 @OA\Property(property="fields", type="object", example={"title": "My Post", "content": "Post content"})
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=400,
     *         description="Bad request - Validation error"
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthorized - Invalid or missing API token"
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="Forbidden - API token doesn't have required permissions"
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Content entry or collection not found"
     *     )
     * )
     */
    public function update(ContentRequest $request, string $collection, string $uuid)
    {
        // Require sanctum token with update ability
        if (!auth('sanctum')->user() || !auth('sanctum')->user()->tokenCan('update')) {
            return response()->json(['message' => 'API token doesn\'t have the right abilities!'], 403);
        }

        $project = $request->attributes->get('project');

        // Resolve collection (slug only for API)
        $collectionModel = Collection::where('project_id', $project->id)
            ->where('slug', $collection)
            ->with('fields')
            ->first();

        if (!$collectionModel) {
            return response()->json(['message' => 'Collection not found.'], 404);
        }

        // Find entry by uuid inside collection
        $entry = $collectionModel->contentEntries()->where('uuid', $uuid)->first();

        if (!$entry) {
            return response()->json(['message' => 'Content not found.'], 404);
        }

        // Inject current entry into route parameters for unique validation exclusion
        $request->route()->setParameter('contentEntry', $entry);

        // Get status from request, default to existing
        $status = $request->input('status', $entry->status);
        if (!in_array($status, ['draft', 'published'])) {
            $status = $entry->status;
        }

        $entry->status = $status;
        $entry->locale = $request->input('locale', $entry->locale);
        $entry->updated_by = null;
        $entry->updated_at = now();

        if ($status === 'published' && !$entry->published_at) {
            $entry->published_at = now();
        }

        $entry->save();

        // Preserve existing password values when necessary
        $passwordFields = $collectionModel->fields()->where('type', 'password')->pluck('id');
        $existingPasswords = $entry->fieldValues()
            ->whereIn('field_id', $passwordFields)
            ->get()
            ->keyBy('field_id');

        $fieldData = $request->input('data', []);

        if ($request->isMethod('put')) {
            // Full replace: remove all existing values and field groups first
            $entry->fieldValues()->forceDelete();
            $entry->fieldGroups()->forceDelete();
        }

        foreach ($fieldData as $fieldName => $value) {
            $field = $collectionModel->fields->firstWhere('name', $fieldName);
            if (!$field) {
                continue;
            }

            // Handle field groups
            if ($field->type === 'group') {
                // For PATCH/PUT: remove old field groups for this field to replace
                $entry->fieldGroups()->where('field_id', $field->id)->forceDelete();
                $this->saveFieldGroup($entry, $field, $value);
            }
            // Handle regular fields
            else {
                // For PATCH/PUT: remove old values for just this field to replace
                $entry->fieldValues()->where('field_id', $field->id)->forceDelete();

                // Handle repeatable
                $isRepeatable = isset($field->options['repeatable']) && $field->options['repeatable'];

                if ($isRepeatable && is_array($value)) {
                    foreach ($value as $item) {
                        $this->saveFieldValue($entry, $field, $item['value'] ?? null);
                    }
                } else {
                    // For password field on PATCH: keep existing if empty
                    if ($field->type === 'password' && empty($value) && isset($existingPasswords[$field->id])) {
                        $this->saveFieldValue($entry, $field, $existingPasswords[$field->id]->text_value);
                    } else {
                        $this->saveFieldValue($entry, $field, $value);
                    }
                }
            }
        }

        // Reload for resource output
        $entry->load([
            'fieldValues.field',
            'fieldValues.mediaRelations.asset.metadata',
            'fieldValues.valueRelations.related',
            'fieldGroups.field',
            'fieldGroups.fieldValues.field',
            'fieldGroups.fieldValues.mediaRelations.asset.metadata',
            'fieldGroups.fieldValues.valueRelations.related',
        ]);

        return new ContentEntryResource($entry);
    }

    /**
     * Delete a content entry (soft-delete by default, force delete with ?force=1)
     * Route: DELETE /api/{collection}/{uuid}
     * 
     * @OA\Delete(
     *     path="/api/{collection}/{uuid}",
     *     summary="Delete content entry",
     *     description="Delete a content entry from the specified collection",
     *     tags={"Content"},
     *     security={{"bearerAuth": {}}},
     *     @OA\Parameter(
     *         name="project-id",
     *         in="header",
     *         required=true,
     *         description="Project identifier (UUID)",
     *         @OA\Schema(type="string", format="uuid", example="550e8400-e29b-41d4-a716-446655440000")
     *     ),
     *     @OA\Parameter(
     *         name="collection",
     *         in="path",
     *         required=true,
     *         description="Collection slug",
     *         @OA\Schema(type="string", example="blog-posts")
     *     ),
     *     @OA\Parameter(
     *         name="uuid",
     *         in="path",
     *         required=true,
     *         description="Content entry UUID",
     *         @OA\Schema(type="string", example="550e8400-e29b-41d4-a716-446655440000")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Content entry deleted successfully",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="message", type="string", example="Content deleted.")
     *         )
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthorized - Invalid or missing API token"
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="Forbidden - API token doesn't have required permissions"
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Content entry or collection not found"
     *     )
     * )
     */
    public function destroy(Request $request, string $collection, string $uuid)
    {
        // Require sanctum token with delete ability
        if (!auth('sanctum')->user() || !auth('sanctum')->user()->tokenCan('delete')) {
            return response()->json(['message' => 'API token doesn\'t have the right abilities!'], 403);
        }

        $project = $request->attributes->get('project');

        $collectionModel = Collection::where('project_id', $project->id)
            ->where('slug', $collection)
            ->first();

        if (!$collectionModel) {
            return response()->json(['message' => 'Collection not found.'], 404);
        }

        $entry = $collectionModel->contentEntries()->withTrashed()->where('uuid', $uuid)->first();

        if (!$entry) {
            return response()->json(['message' => 'Content not found.'], 404);
        }

        if($request->input('force')) {
            $entry->fieldValues()->forceDelete();
            $entry->fieldGroups()->forceDelete();
            $entry->forceDelete();
        } else {
            $entry->delete();
        }

        return response()->json(['message' => 'Content deleted.'], 200);
    }

    /* ---------------------------------------------------------------------
     | Helper methods borrowed from the admin ContentController            |
     ---------------------------------------------------------------------*/

    protected function saveFieldValue($contentEntry, $field, $value)
    {
        // Skip empty non-required values
        if (is_null($value) || $value === '') {
            return;
        }

        $fieldValue = new ContentFieldValue([
            'project_id'       => $contentEntry->project_id,
            'collection_id'    => $contentEntry->collection_id,
            'content_entry_id' => $contentEntry->id,
            'field_id'         => $field->id,
            'field_type'       => $field->type,
        ]);

        switch ($field->type) {
            case 'number':
                $fieldValue->number_value = $value;
                break;
            case 'boolean':
                $fieldValue->boolean_value = (bool) $value;
                break;
            case 'date':
                // Support range & single date
                if (isset($field->options['mode']) && $field->options['mode'] === 'range') {
                    if (is_string($value)) {
                        [$start, $end] = array_pad(explode(' - ', $value), 2, null);
                        if (isset($field->options['includeTime']) && $field->options['includeTime']) {
                            $fieldValue->datetime_value = $start;
                            $fieldValue->datetime_value_end = $end;
                        } else {
                            $fieldValue->date_value = $start;
                            $fieldValue->date_value_end = $end;
                        }
                    }
                } else {
                    if (isset($field->options['includeTime']) && $field->options['includeTime']) {
                        $fieldValue->datetime_value = $value;
                    } else {
                        $fieldValue->date_value = $value;
                    }
                }
                break;
            case 'enumeration':
                // Ensure we always store an array of scalar values (no nested objects)
                $vals = [];
                if (is_array($value)) {
                    foreach ($value as $v) {
                        if (is_array($v) && array_key_exists('value', $v)) {
                            $vals[] = $v['value'];
                        } else {
                            $vals[] = $v;
                        }
                    }
                } else {
                    $vals[] = $value;
                }

                $fieldValue->json_value = $vals;
                break;
            case 'json':
                $fieldValue->json_value = is_array($value) ? $value : [$value];
                break;
            case 'media':
                $identifiers = is_array($value) ? $value : [$value];

                // Convert UUIDs to numeric IDs (keep numeric IDs as-is)
                $mediaIds = [];
                foreach ($identifiers as $identifier) {
                    if (empty($identifier)) {
                        continue;
                    }
                    if (is_numeric($identifier)) {
                        $mediaIds[] = (int) $identifier;
                    } else {
                        $asset = \App\Models\Asset::where('uuid', $identifier)->first();
                        if ($asset) {
                            $mediaIds[] = $asset->id;
                        }
                    }
                }

                // Remove duplicates & reindex
                $mediaIds = array_values(array_unique($mediaIds));

                // Store resolved IDs for easier querying later
                $fieldValue->json_value = $mediaIds;
                $fieldValue->save();

                $this->handleMediaRelations($fieldValue, $mediaIds);
                return;
            case 'relation':
                $identifiers = is_array($value) ? $value : [$value];

                // Convert UUIDs to numeric content_entry IDs
                $relIds = [];
                foreach ($identifiers as $identifier) {
                    if (empty($identifier)) {
                        continue;
                    }
                    if (is_numeric($identifier)) {
                        $relIds[] = (int) $identifier;
                    } else {
                        $entry = \App\Models\ContentEntry::where('uuid', $identifier)->first();
                        if ($entry) {
                            $relIds[] = $entry->id;
                        }
                    }
                }

                $relIds = array_values(array_unique($relIds));

                $fieldValue->json_value = $relIds;
                $fieldValue->save();
                $this->handleRelationFields($fieldValue, $relIds);
                return;
            case 'password':
                if ($value) {
                    $fieldValue->text_value = Hash::make($value);
                }
                break;
            case 'richtext':
                $fieldValue->text_value = $value;
                break;
            default:
                // text, longtext, email, slug, color, time etc.
                $fieldValue->text_value = $value;
        }

        $fieldValue->save();
    }

    protected function handleMediaRelations($fieldValue, $mediaIds)
    {
        if (empty($mediaIds)) {
            return;
        }

        $fieldValue->mediaRelations()->delete();

        foreach ($mediaIds as $idx => $mediaId) {
            $fieldValue->mediaRelations()->create([
                'asset_id'   => $mediaId,
                'sort_order' => $idx,
            ]);
        }
    }

    protected function handleRelationFields($fieldValue, $relationIds)
    {
        if (empty($relationIds)) {
            return;
        }

        $relationIds = is_array($relationIds) ? $relationIds : [$relationIds];

        $fieldValue->valueRelations()->delete();

        foreach ($relationIds as $idx => $relId) {
            $fieldValue->valueRelations()->create([
                'related_id'   => $relId,
                'related_type' => ContentEntry::class,
                'sort_order'   => $idx,
            ]);
        }
    }

    protected function saveFieldGroup($contentEntry, $field, $value)
    {
        // Load children if not already loaded
        if (!$field->relationLoaded('children')) {
            $field->load('children');
        }
        
        // Get child fields for this group
        $childFields = $field->children()->orderBy('order')->get();
        
        if ($childFields->isEmpty()) {
            return;
        }
        
        // Check if group is repeatable
        $isRepeatable = isset($field->options['repeatable']) && $field->options['repeatable'];
        
        // Normalize value to array format
        if ($isRepeatable) {
            // Value should be an array of group instances
            $groupInstances = is_array($value) ? $value : [];
        } else {
            // Value should be a single object, wrap it in array
            $groupInstances = is_array($value) && isset($value[0]) ? $value : ($value ? [$value] : []);
        }
        
        // Create group instances and save child field values
        foreach ($groupInstances as $sortOrder => $instanceData) {
            if (!is_array($instanceData)) {
                continue;
            }
            
            // Create the group instance
            $groupInstance = \App\Models\ContentFieldGroup::create([
                'project_id' => $contentEntry->project_id,
                'collection_id' => $contentEntry->collection_id,
                'content_entry_id' => $contentEntry->id,
                'field_id' => $field->id,
                'sort_order' => $sortOrder,
            ]);
            
            // Save child field values for this group instance
            foreach ($childFields as $childField) {
                $childValue = $instanceData[$childField->name] ?? null;
                
                if ($childValue !== null) {
                    $this->saveFieldValueForGroup($contentEntry, $childField, $childValue, $groupInstance->id);
                }
            }
        }
    }
    
    protected function saveFieldValueForGroup($contentEntry, $field, $value, $groupInstanceId)
    {
        // Skip if value is empty and field is not required
        if (
            (is_null($value) || $value === '') && 
            (!isset($field->validations['required']) || !$field->validations['required']['status'])
        ) {
            return;
        }

        $fieldValue = new ContentFieldValue([
            'project_id' => $contentEntry->project_id,
            'collection_id' => $contentEntry->collection_id,
            'content_entry_id' => $contentEntry->id,
            'field_id' => $field->id,
            'field_type' => $field->type,
            'group_instance_id' => $groupInstanceId,
        ]);
        
        // Set the appropriate value column based on field type (same logic as saveFieldValue)
        switch ($field->type) {
            case 'text':
            case 'longtext':
            case 'slug':
            case 'email':
            case 'color':
            case 'time':
                $fieldValue->text_value = $value;
                break;
            case 'richtext':
                $json_value = $value['json'] ?? null;
                $html_value = $value['html'] ?? null;
                
                $fieldValue->json_value = $json_value;
                $fieldValue->text_value = $html_value;
                break;
            case 'password':
                if ($value) {
                    $fieldValue->text_value = Hash::make($value);
                }
                break;
            case 'number':
                $fieldValue->number_value = $value;
                break;
            case 'enumeration':
                $vals = [];
                if (is_array($value)) {
                    foreach ($value as $v) {
                        if (is_array($v) && array_key_exists('value', $v)) {
                            $vals[] = $v['value'];
                        } else {
                            $vals[] = $v;
                        }
                    }
                } else {
                    $vals[] = $value;
                }
                $fieldValue->json_value = $vals;
                break;
            case 'boolean':
                $fieldValue->boolean_value = (bool) $value;
                break;
            case 'date':
                if (isset($field->options['mode']) && $field->options['mode'] === 'range') {
                    if (is_string($value)) {
                        [$start, $end] = array_pad(explode(' - ', $value), 2, null);
                        if (isset($field->options['includeTime']) && $field->options['includeTime']) {
                            $fieldValue->datetime_value = $start;
                            $fieldValue->datetime_value_end = $end;
                        } else {
                            $fieldValue->date_value = $start;
                            $fieldValue->date_value_end = $end;
                        }
                    }
                } else {
                    if (isset($field->options['includeTime']) && $field->options['includeTime']) {
                        $fieldValue->datetime_value = $value;
                    } else {
                        $fieldValue->date_value = $value;
                    }
                }
                break;
            case 'json':
                $fieldValue->json_value = is_array($value) ? $value : json_decode($value, true);
                break;
            case 'media':
                $identifiers = is_array($value) ? $value : [$value];
                $mediaIds = [];
                foreach ($identifiers as $identifier) {
                    if (empty($identifier)) {
                        continue;
                    }
                    if (is_numeric($identifier)) {
                        $mediaIds[] = (int) $identifier;
                    } else {
                        $asset = \App\Models\Asset::where('uuid', $identifier)->first();
                        if ($asset) {
                            $mediaIds[] = $asset->id;
                        }
                    }
                }
                $mediaIds = array_values(array_unique($mediaIds));
                $fieldValue->json_value = $mediaIds;
                $fieldValue->save();
                $this->handleMediaRelations($fieldValue, $mediaIds);
                return;
            case 'relation':
                $identifiers = is_array($value) ? $value : [$value];
                $relIds = [];
                foreach ($identifiers as $identifier) {
                    if (empty($identifier)) {
                        continue;
                    }
                    if (is_numeric($identifier)) {
                        $relIds[] = (int) $identifier;
                    } else {
                        $entry = \App\Models\ContentEntry::where('uuid', $identifier)->first();
                        if ($entry) {
                            $relIds[] = $entry->id;
                        }
                    }
                }
                $relIds = array_values(array_unique($relIds));
                $fieldValue->json_value = $relIds;
                $fieldValue->save();
                $this->handleRelationFields($fieldValue, $relIds);
                return;
            default:
                $fieldValue->text_value = (string) $value;
                break;
        }

        $fieldValue->save();
    }
} 