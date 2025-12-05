<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use App\Models\{Project, Collection, Field, ContentEntry, ContentFieldValue, ContentRelationFieldRelation};
use Carbon\Carbon;

class ApiEdgeCaseSeeder extends Seeder
{
    /**
     * Seed an additional project with edge-case records to exercise every API filter scenario.
     */
    public function run(): void
    {
        /* ---------- Project ---------- */
        $project = Project::create([
            'name'           => 'Edge-Case Test Project',
            'description'    => 'Extra dataset focusing on unusual combinations & edge-cases',
            'default_locale' => 'en',
            'locales'        => ['en', 'es', 'jp'],
            'disk'           => 'public',
            'public_api'     => true,
        ]);

        /* ---------- Collections ---------- */
        $categories = $this->makeCollection($project, 'Categories', 'categories2');
        $items      = $this->makeCollection($project, 'Items',       'items');

        /* ---------- Category fields ---------- */
        $this->textField($categories, 'Title', 'title');
        $this->enumField($categories, 'Sector', 'sector', ['Tech','Home','Outdoor','Fashion']);
        $this->colorField($categories, 'Display Color', 'color');

        /* ---------- Item fields ---------- */
        $this->textField($items, 'Name', 'name');
        $priceField      = $this->numberField($items, 'Price', 'price');
        $this->numberField($items, 'Stock', 'stock');
        $this->booleanField($items, 'On Sale', 'on_sale');
        $this->enumField($items, 'Tags', 'tags', ['Tech','Home','Outdoor','Fashion'], true);
        $this->dateField($items, 'Release Date', 'release_date');
        $this->dateField($items, 'Discount Period', 'discount_period', ['mode'=>'range']);
        $catRelFieldMulti = $this->relationField($items, 'Categories', 'categories', $categories->id, 2); // many-to-many

        /* ---------- Seed Categories ---------- */
        $catIds = [];
        foreach ([
            ['Gaming','Tech','#ff4500'],
            ['Kitchen','Home','#008b8b'],
            ['Camping','Outdoor','#556b2f'],
            ['Streetwear','Fashion','#800080'],
        ] as [$title,$sector,$color]) {
            $catIds[] = $this->makeEntry($categories,[
                'title'  => $title,
                'sector' => $sector,
                'color'  => $color,
            ]);
        }

        /* ---------- Seed Items ---------- */
        for ($i = 1; $i <= 60; $i++) {
            $status    = $i % 9 === 0 ? 'draft' : 'published';
            $locale    = ['en','es','jp'][$i % 3];
            $price     = rand(10, 500) + ($i % 2 === 0 ? 0.99 : 0); // some decimals
            $onSale    = $i % 4 === 0;
            $release   = $i % 5 === 0 ? null : now()->subDays(rand(0, 365))->toDateString(); // some nulls
            $discount  = $i % 6 === 0 ? [
                'start' => Carbon::now()->subDays(rand(1,30))->toDateString(),
                'end'   => Carbon::now()->addDays(rand(5,30))->toDateString(),
            ] : null;
            $tagPick   = ['Tech','Home','Outdoor','Fashion'];
            shuffle($tagPick);
            $tagSample = array_slice($tagPick, 0, rand(1,3));
            $relatedCats = [$catIds[$i % 4]];
            if ($i % 7 === 0) { // sometimes multi-categories
                $relatedCats[] = $catIds[($i+1) % 4];
            }

            $this->makeEntry($items,[
                'name'            => "Item $i",
                'price'           => $price,
                'stock'           => rand(0, 200),
                'on_sale'         => $onSale,
                'tags'            => $tagSample,
                'release_date'    => $release,
                'discount_period' => $discount,
                'categories'      => $relatedCats,
            ], $status, $locale);
        }
    }

    /* --------------------------------------------------------------------- */
    /*  Helper methods (copied from ApiPlaygroundSeeder)                     */
    /* --------------------------------------------------------------------- */

    private function makeCollection(Project $p,string $name,string $slug): Collection
    {
        return Collection::create([
            'project_id' => $p->id,
            'name'       => $name,
            'slug'       => $slug,
            'order'      => 1,
            'uuid'       => Str::uuid(),
        ]);
    }

    private function baseField(array $override): Field
    {
        return Field::create(array_merge([
            'order' => 1,
            'uuid'  => Str::uuid(),
        ], $override));
    }

    private function textField(Collection $c,string $label,string $name,array $opts=[]): Field
    {
        return $this->baseField([
            'collection_id'=>$c->id,
            'project_id'=>$c->project_id,
            'type'=>'text','label'=>$label,'name'=>$name,'options'=>$opts
        ]);
    }

    private function numberField(Collection $c,string $label,string $name): Field
    {
        return $this->baseField([
            'collection_id'=>$c->id,
            'project_id'=>$c->project_id,
            'type'=>'number','label'=>$label,'name'=>$name,'options'=>[]
        ]);
    }

    private function booleanField(Collection $c,string $label,string $name): Field
    {
        return $this->baseField([
            'collection_id'=>$c->id,
            'project_id'=>$c->project_id,
            'type'=>'boolean','label'=>$label,'name'=>$name,'options'=>[]
        ]);
    }

    private function enumField(Collection $c,string $label,string $name,array $list,bool $multiple=false): Field
    {
        return $this->baseField([
            'collection_id'=>$c->id,
            'project_id'=>$c->project_id,
            'type'=>'enumeration','label'=>$label,'name'=>$name,
            'options'=>[
                'multiple'=>$multiple,
                'enumeration'=>['list'=>$list],
            ]
        ]);
    }

    private function dateField(Collection $c,string $label,string $name,array $opts=[]): Field
    {
        return $this->baseField([
            'collection_id'=>$c->id,
            'project_id'=>$c->project_id,
            'type'=>'date','label'=>$label,'name'=>$name,'options'=>$opts
        ]);
    }

    private function colorField(Collection $c,string $label,string $name): Field
    {
        return $this->baseField([
            'collection_id'=>$c->id,
            'project_id'=>$c->project_id,
            'type'=>'color','label'=>$label,'name'=>$name,'options'=>[]
        ]);
    }

    private function relationField(Collection $c,string $label,string $name,int $relCollectionId,int $type=1): Field
    {
        return $this->baseField([
            'collection_id'=>$c->id,
            'project_id'=>$c->project_id,
            'type'=>'relation','label'=>$label,'name'=>$name,
            'options'=>[
                'relation'=>['collection'=>$relCollectionId,'type'=>$type],
            ],
        ]);
    }

    private function booleanOrNull(): ?bool
    {
        return rand(0,2) ? (bool)rand(0,1) : null; // sometimes null
    }

    private function makeEntry(Collection $c,array $values,string $status='published',string $locale='en'): int
    {
        $entry = ContentEntry::create([
            'project_id'=>$c->project_id,
            'collection_id'=>$c->id,
            'locale'=>$locale,
            'status'=>$status,
            'published_at'=>$status==='published'?now():null,
            'uuid'=>Str::uuid(),
        ]);

        foreach ($values as $fieldName=>$v) {
            $field=$c->fields()->where('name',$fieldName)->first();
            if(!$field) continue;

            $fv=ContentFieldValue::create([
                'project_id'=>$c->project_id,
                'collection_id'=>$c->id,
                'content_entry_id'=>$entry->id,
                'field_id'=>$field->id,
                'field_type'=>$field->type,
            ]);

            switch($field->type){
                case 'number': $fv->number_value=$v; break;
                case 'boolean':$fv->boolean_value=$v;break;
                case 'color':  $fv->text_value=$v; break;
                case 'date':
                    if (is_array($v)) {
                        if (!$v) { // allow null discount period
                            break;
                        }
                        try {
                            $fv->date_value     = Carbon::parse($v['start']);
                            $fv->date_value_end = Carbon::parse($v['end']);
                        } catch (\Exception $e) {
                            $fv->date_value     = $v['start'];
                            $fv->date_value_end = $v['end'];
                        }
                    } else {
                        if ($v === null) break;
                        $fv->date_value = $v;
                    }
                    break;
                case 'enumeration':
                    $fv->json_value=$field->options['multiple']?(array)$v:[$v];
                    break;
                case 'relation': break; // after save
                default: $fv->text_value=$v;
            }
            $fv->save();

            if($field->type==='relation' && $v){
                foreach((array)$v as $idx=>$rid){
                    ContentRelationFieldRelation::create([
                        'field_value_id'=>$fv->id,
                        'related_id'=>$rid,
                        'related_type'=>ContentEntry::class,
                        'sort_order'=>$idx,
                    ]);
                }
            }
        }
        return $entry->id;
    }
} 