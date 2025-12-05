<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use App\Models\{Project, Collection, Field, ContentEntry, ContentFieldValue, ContentRelationFieldRelation};
use Carbon\Carbon;

class ApiPlaygroundSeeder extends Seeder
{
    /**
     * Seed the application's database with a full playground for API testing.
     */
    public function run(): void
    {
        /* ---------- Project ---------- */
        $project = Project::create([
            'name'           => 'API Test Project',
            'description'    => 'Dataset for exercising API filters',
            'default_locale' => 'en',
            'locales'        => ['en', 'fr', 'de'],
            'disk'           => 'public',
            'public_api'     => true,
        ]);

        /* ---------- Collections ---------- */
        $authors   = $this->makeCollection($project, 'Authors',  'authors');
        $posts     = $this->makeCollection($project, 'Posts',    'posts');
        $products  = $this->makeCollection($project, 'Products', 'products');

        /* ---------- Author fields ---------- */
        $this->textField($authors, 'Name',    'name');
        $this->textField($authors, 'Surname', 'surname');

        /* ---------- Post fields ---------- */
        $this->textField($posts, 'Title', 'title');
        $this->textField($posts, 'Body',  'body');
        $this->numberField($posts, 'Price', 'price');
        $this->dateField($posts, 'Published Range', 'published_at', ['mode' => 'range']);
        $this->enumField($posts, 'Tags', 'tags', ['News','Tech','Life','Sport'], true);
        $authorRelField = $this->relationField($posts, 'Author', 'author', $authors->id, 1);

        /* ---------- Product fields ---------- */
        $this->textField($products,'Name','name');
        $this->numberField($products,'Price','price');
        $this->enumField($products,'Category','category',['Phone','Laptop','Tablet']);

        /* ---------- Seed Authors ---------- */
        $authorIds = [];
        foreach ([['John','Doe'],['Jane','Doe'],['Max','Mustermann']] as [$n,$s]) {
            $authorIds[] = $this->makeEntry($authors,[ 'name'=>$n, 'surname'=>$s ]);
        }

        /* ---------- Seed Posts ---------- */
        for ($i=1; $i<=30; $i++) {
            $status = $i % 7 === 0 ? 'draft' : 'published';
            $locale = ['en','fr','de'][$i % 3];
            $this->makeEntry($posts,[
                'title'  => ($i%5===0?'About ':'')."Post $i",
                'body'   => 'Lorem ipsum',
                'price'  => rand(50,300),
                'published_at' => [
                    'start' => now()->subDays($i+5)->toDateString(),
                    'end'   => now()->subDays($i)->toDateString(),
                ],
                'tags'   => ['News','Tech','Life','Sport'][$i % 4],
                'author' => $authorIds[$i % count($authorIds)],
            ], $status, $locale);
        }

        /* ---------- Seed Products ---------- */
        for ($i=1; $i<=20; $i++) {
            $this->makeEntry($products,[
                'name'     => "Gadget $i",
                'price'    => rand(80,600),
                'category' => ['Phone','Laptop','Tablet'][$i % 3],
            ]);
        }
    }

    /* --------------------------------------------------------------------- */
    /*  Helper methods                                                       */
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
                case 'date':
                    if (is_array($v)) {
                        try {
                            $fv->date_value     = Carbon::parse($v['start']);
                            $fv->date_value_end = Carbon::parse($v['end']);
                        } catch (\Exception $e) {
                            // fallback to plain strings
                            $fv->date_value     = $v['start'];
                            $fv->date_value_end = $v['end'];
                        }
                    } else {
                        // legacy single string – maybe 'start - end'
                        if (is_string($v) && str_contains($v, ' - ')) {
                            [$s, $e] = array_map('trim', explode(' - ', $v));
                            $fv->date_value     = $s;
                            $fv->date_value_end = $e;
                        } else {
                            $fv->date_value = $v;
                        }
                    }
                    break;
                case 'enumeration':
                    $fv->json_value=$field->options['multiple']?(array)$v:[$v];
                    break;
                case 'relation': break; // after save
                default: $fv->text_value=$v;
            }
            $fv->save();

            if($field->type==='relation'){
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