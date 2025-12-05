<?php 

namespace Tests\Feature\API;

use Tests\TestCase;
use App\Models\User;
use App\Models\Project;
use App\Models\ProjectTemplate;
use App\Http\Controllers\ProjectController;
use Database\Seeders\ProjectTemplateSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

/**
 * API Project Tests
 * 
 * This test class uses a shared project created in setUp() to avoid creating
 * new projects in every test, improving performance and test isolation.
 * 
 * The shared project:
 * - Uses the 'blog-next-js' template
 * - Includes demo content
 * - Has public_api = true by default
 * - Can be modified by individual tests as needed
 */
class APIProjectTest extends TestCase {
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Create a user for the demo content
        $this->user = User::factory()->create();

        // Seed project templates from the JSON file
        $seeder = new ProjectTemplateSeeder();
        $seeder->run();
        
        // Create a single project with template that all tests can use
        // This project includes demo content and has public_api = true by default
        $this->project = self::createProjectFromTemplateStatic('blog-next-js', true);
    }

    /**
     * Helper method to reset project state for tests that need specific settings
     */
    protected function resetProjectState(): void
    {
        $this->project->refresh();
    }

    /**
     * Static helper method to create a project from a template with optional demo content
     * This can be used in other parts of the application
     */
    public static function createProjectFromTemplateStatic(string $templateSlug, bool $withDemoData = false, array $projectData = []): Project
    {
        // Create the project with default or custom data
        $defaultProjectData = [
            'name' => 'Test Project from Template',
            'description' => 'A test project created from template',
            'default_locale' => 'en',
            'locales' => ['en'],
            'disk' => 'public',
            'public_api' => true,
        ];

        $mergedData = array_merge($defaultProjectData, $projectData);
        
        // Preserve the public_api value if it was explicitly set
        $preservePublicApi = $mergedData['public_api'] ?? null;

        $project = Project::create($mergedData);

        // Use reflection to access the protected applyTemplate method
        $controller = new ProjectController();
        $reflection = new \ReflectionClass($controller);
        $method = $reflection->getMethod('applyTemplate');
        $method->setAccessible(true);
        $method->invoke($controller, $project, $templateSlug, $withDemoData);

        // Always refresh the project after applyTemplate to ensure all relationships are loaded
        $project->refresh();
        $project->load('collections');

        // Restore public_api if it was explicitly set (template might have overwritten it)
        if ($preservePublicApi !== null) {
            $project->update(['public_api' => $preservePublicApi]);
            $project->refresh();
            $project->load('collections');
        }

        return $project;
    }

    /**
     * Helper method to get template data for dynamic testing
     */
    protected function getTemplateData(string $templateSlug): array
    {
        $template = ProjectTemplate::where('slug', $templateSlug)->first();
        
        // Fallback to JSON files if not found in DB (same as applyTemplate)
        if (!$template) {
            $templatesDir = resource_path('data/project_templates');
            
            if (is_dir($templatesDir)) {
                $templatePath = $templatesDir . '/' . $templateSlug . '.json';
                if (file_exists($templatePath)) {
                    $templateData = json_decode(file_get_contents($templatePath), true);
                    if ($templateData) {
                        return $templateData;
                    }
                }
            }
            
            throw new \Exception("Template with slug '{$templateSlug}' not found");
        }
        
        return $template->data;
    }

    /**
     * Helper method to dynamically test collections from template data
     */
    protected function assertCollectionsFromTemplate(string $templateSlug, $response): void
    {
        $templateData = $this->getTemplateData($templateSlug);
        $collections = $templateData['collections'] ?? [];

        // Assert the correct number of collections
        $this->assertCount(count($collections), $response->json());

        // Dynamically assert each collection from the template
        foreach ($collections as $collectionData) {
            $collectionName = $collectionData['name'];
            $collectionSlug = $collectionData['slug'];
            $isSingleton = $collectionData['is_singleton'] ?? false;

            // Find the collection in the response
            $responseCollection = collect($response->json())->firstWhere('slug', $collectionSlug);
            
            $this->assertNotNull($responseCollection, "Collection with slug '{$collectionSlug}' not found in response");
            $this->assertEquals($collectionName, $responseCollection['name'], "Collection name mismatch for '{$collectionSlug}'");
            $this->assertEquals($collectionSlug, $responseCollection['slug'], "Collection slug mismatch for '{$collectionSlug}'");
            $this->assertEquals($isSingleton, $responseCollection['is_singleton'], "Collection singleton status mismatch for '{$collectionSlug}'");
        }
    }

    /**
     * Helper method to dynamically test a single collection with fields from template data
     */
    protected function assertCollectionWithFieldsFromTemplate(string $templateSlug, string $collectionSlug, $response): void
    {
        $templateData = $this->getTemplateData($templateSlug);
        $collectionData = collect($templateData['collections'])->firstWhere('slug', $collectionSlug);
        
        if (!$collectionData) {
            $this->fail("Collection '{$collectionSlug}' not found in template '{$templateSlug}'");
        }

        $response->assertStatus(200);
        
        // Assert the response structure
        $response->assertJsonStructure([
            'uuid',
            'name',
            'slug',
            'is_singleton',
            'created_at',
            'updated_at',
            'fields' => [
                '*' => [
                    'type',
                    'label',
                    'name',
                    'description',
                    'placeholder',
                    'options',
                    'validations',
                ]
            ]
        ]);
        
        // Verify collection data matches template
        $responseData = $response->json();
        $this->assertEquals($collectionData['name'], $responseData['name'], 
            "Collection name mismatch for '{$collectionSlug}'");
        $this->assertEquals($collectionData['slug'], $responseData['slug'], 
            "Collection slug mismatch for '{$collectionSlug}'");
        $this->assertEquals($collectionData['is_singleton'] ?? false, $responseData['is_singleton'], 
            "Collection singleton status mismatch for '{$collectionSlug}'");
        
        // Verify fields data matches template
        $this->assertCount(count($collectionData['fields']), $responseData['fields'], 
            "Field count mismatch for collection '{$collectionSlug}'");
        
        foreach ($collectionData['fields'] as $fieldData) {
            $fieldName = $fieldData['name'];
            $responseField = collect($responseData['fields'])->firstWhere('name', $fieldName);
            
            $this->assertNotNull($responseField, "Field '{$fieldName}' not found in collection '{$collectionSlug}' response");
            $this->assertEquals($fieldData['type'], $responseField['type'], 
                "Field type mismatch for '{$fieldName}' in collection '{$collectionSlug}'");
            $this->assertEquals($fieldData['label'], $responseField['label'], 
                "Field label mismatch for '{$fieldName}' in collection '{$collectionSlug}'");
            $this->assertEquals($fieldData['description'] ?? null, $responseField['description'], 
                "Field description mismatch for '{$fieldName}' in collection '{$collectionSlug}'");
            $this->assertEquals($fieldData['placeholder'] ?? null, $responseField['placeholder'], 
                "Field placeholder mismatch for '{$fieldName}' in collection '{$collectionSlug}'");
        }
    }

    /**
     * Helper method to find an entry by matching field values
     */
    protected function findEntryByFieldValues($collection, array $fieldValues): ?\App\Models\ContentEntry
    {
        foreach ($collection->contentEntries as $entry) {
            $matches = true;
            
            foreach ($fieldValues as $fieldName => $expectedValue) {
                $field = $collection->fields()->where('name', $fieldName)->first();
                if (!$field) continue;
                
                $fieldValue = $entry->fieldValues()->where('field_id', $field->id)->first();
                if (!$fieldValue) {
                    $matches = false;
                    break;
                }
                
                $actualValue = $this->getFieldValue($fieldValue, $field->type);
                if (!$this->fieldValuesMatch($actualValue, $expectedValue, $field->type)) {
                    $matches = false;
                    break;
                }
            }
            
            if ($matches) {
                return $entry;
            }
        }
        
        return null;
    }

    /**
     * Helper method to get the actual value from a field value
     */
    protected function getFieldValue($fieldValue, string $fieldType)
    {
        switch ($fieldType) {
            case 'text':
            case 'longtext':
            case 'richtext':
            case 'slug':
            case 'email':
            case 'password':
            case 'color':
                return $fieldValue->text_value;
            case 'number':
                return $fieldValue->number_value;
            case 'boolean':
                return $fieldValue->boolean_value;
            case 'date':
                return $fieldValue->date_value;
            case 'enumeration':
                return $fieldValue->json_value;
            default:
                return $fieldValue->text_value;
        }
    }

    /**
     * Helper method to compare field values with more flexible matching
     */
    protected function fieldValuesMatch($actualValue, $expectedValue, string $fieldType): bool
    {
        // Handle null values
        if ($actualValue === null && $expectedValue === null) {
            return true;
        }
        
        if ($actualValue === null || $expectedValue === null) {
            return false;
        }

        switch ($fieldType) {
            case 'text':
            case 'longtext':
            case 'richtext':
            case 'slug':
            case 'email':
            case 'password':
            case 'color':
                return (string) $actualValue === (string) $expectedValue;
            case 'number':
                return (float) $actualValue === (float) $expectedValue;
            case 'boolean':
                return (bool) $actualValue === (bool) $expectedValue;
            case 'date':
                // For dates, we might need to handle different formats
                return (string) $actualValue === (string) $expectedValue;
            case 'enumeration':
                // For enumerations, handle both single values and arrays
                if (is_array($expectedValue)) {
                    return is_array($actualValue) && count(array_diff($actualValue, $expectedValue)) === 0;
                } else {
                    return is_array($actualValue) ? in_array($expectedValue, $actualValue) : $actualValue === $expectedValue;
                }
            default:
                return (string) $actualValue === (string) $expectedValue;
        }
    }

    /**
     * Dynamic test that verifies demo content is created correctly from template
     */
    public function test_project_demo_content_created_from_template()
    {
        $templateData = $this->getTemplateData('blog-next-js');
        
        // Only test if template has demo data
        if (empty($templateData['demo_data'])) {
            $this->markTestSkipped('Template has no demo data');
        }
        
        // Verify that demo content was created for collections that have demo data
        foreach ($templateData['demo_data'] as $demoGroup) {
            $collectionSlug = $demoGroup['collection'];
            $collection = $this->project->collections()->where('slug', $collectionSlug)->first();
            
            $this->assertNotNull($collection, "Collection '{$collectionSlug}' not found in project");
            
            // Count expected entries for this collection
            $expectedEntryCount = count($demoGroup['entries']);
            $actualEntryCount = $collection->contentEntries()->count();
            
            $this->assertEquals($expectedEntryCount, $actualEntryCount, 
                "Expected {$expectedEntryCount} entries for collection '{$collectionSlug}', got {$actualEntryCount}");
            
            // Verify that entries have the expected status and locale
            $entries = $collection->contentEntries;
            foreach ($entries as $entry) {
                $this->assertContains($entry->status, ['draft', 'published'], 
                    "Entry status should be 'draft' or 'published' in collection '{$collectionSlug}'");
                $this->assertEquals($this->project->default_locale, $entry->locale, 
                    "Entry locale should match project default locale in collection '{$collectionSlug}'");
                
                // Verify that entries have field values
                $this->assertGreaterThan(0, $entry->fieldValues()->count(), 
                    "Entry should have field values in collection '{$collectionSlug}'");
            }
        }
        
        // Verify that the project has content entries overall
        $totalEntries = $this->project->content()->count();
        $this->assertGreaterThan(0, $totalEntries, "Project should have demo content entries");
    }

    public function test_project_created_from_template_with_demo_content()
    {
        // Use the project created in setUp()
        
        // Verify the project was created
        $this->assertDatabaseHas('projects', [
            'id' => $this->project->id,
            'name' => 'Test Project from Template',
            'public_api' => true,
        ]);

        // Verify collections were created (blog-next-js template has multiple collections)
        $this->assertDatabaseHas('collections', [
            'project_id' => $this->project->id,
            'slug' => 'about',
            'name' => 'About',
        ]);

        // Verify fields were created
        $collection = $this->project->collections()->where('slug', 'about')->first();
        $this->assertDatabaseHas('collection_fields', [
            'collection_id' => $collection->id,
            'name' => 'name',
            'type' => 'text',
        ]);

        // Verify demo content was created
        $this->assertDatabaseHas('content_entries', [
            'project_id' => $this->project->id,
            'collection_id' => $collection->id,
            'status' => 'published',
        ]);

        // Verify demo content has field values
        $entry = $this->project->content()->first();
        $this->assertDatabaseHas('content_field_values', [
            'content_entry_id' => $entry->id,
            'field_type' => 'text',
        ]);

        // Verify the template exists in the database
        $template = ProjectTemplate::where('slug', 'blog-next-js')->first();
        $this->assertNotNull($template);
        $this->assertTrue($template->has_demo_data);
    }

    /**
     * Test that verifies fields are created correctly from template
     */
    public function test_project_fields_created_from_template()
    {
        $templateData = $this->getTemplateData('blog-next-js');
        
        foreach ($templateData['collections'] as $collectionData) {
            $collectionSlug = $collectionData['slug'];
            $collection = $this->project->collections()->where('slug', $collectionSlug)->first();
            
            $this->assertNotNull($collection, "Collection '{$collectionSlug}' not found in project");
            
            // Test that all fields from template are created
            foreach ($collectionData['fields'] as $fieldData) {
                $fieldName = $fieldData['name'];
                $fieldType = $fieldData['type'];
                
                $field = $collection->fields()->where('name', $fieldName)->first();
                
                $this->assertNotNull($field, "Field '{$fieldName}' not found in collection '{$collectionSlug}'");
                $this->assertEquals($fieldType, $field->type, "Field type mismatch for '{$fieldName}' in collection '{$collectionSlug}'");
                $this->assertEquals($fieldData['label'], $field->label, "Field label mismatch for '{$fieldName}' in collection '{$collectionSlug}'");
            }
            
            // Test that the correct number of fields are created
            $this->assertCount(count($collectionData['fields']), $collection->fields);
        }
    }

    public function test_api_url_returns_400_if_project_header_is_missing()
    {
        $response = $this->get('/api');
        $response->assertJson([
            'message' => 'Project header missing.'
        ]);
        $response->assertStatus(400);
    }

    public function test_api_url_returns_project_if_public_api_is_enabled()
    {
        $this->project->update(['public_api' => true]);
        $this->project->refresh();
        $response = $this->withHeaders(['project-id' => $this->project->uuid])->get('/api');
        $response->assertJsonStructure([
            'uuid',
            'name',
            'description',
            'default_locale',
            'locales',
        ]);
        $response->assertStatus(200);
    }

    public function test_api_url_returns_401_if_public_api_is_disabled()
    {
        $this->project->update(['public_api' => false]);
        $this->project->refresh();
        $response = $this->withHeaders(['project-id' => $this->project->uuid])->get('/api');
        $response->assertJson([
            'message' => 'Unauthenticated.'
        ]);
        $response->assertStatus(401);
    }

    public function test_api_url_returns_403_if_token_does_not_have_read_ability()
    {
        $this->project->update(['public_api' => false]);
        $this->project->refresh();
        $response = $this->withHeaders([
            'project-id' => $this->project->uuid,
            'Authorization' => 'Bearer ' . $this->project->createToken('test-token', [])->plainTextToken
        ])->get('/api');
        $response->assertJson([
            'message' => 'API token does\'nt have the right abilities!'
        ]);
        $response->assertStatus(403);
    }

    public function test_api_url_returns_project_if_token_has_read_ability()
    {
        $this->project->update(['public_api' => false]);
        $this->project->refresh();
        $response = $this->withHeaders([
            'project-id' => $this->project->uuid,
            'Authorization' => 'Bearer ' . $this->project->createToken('test-token', ['read'])->plainTextToken
        ])->get('/api');
        $response->assertJsonStructure([
            'uuid',
            'name',
            'description',
            'default_locale',
            'locales',
        ]);
        $response->assertStatus(200);
    }

    public function test_api_url_returns_project_if_token_does_not_have_read_ability_but_public_api_is_enabled()
    {
        $this->project->update(['public_api' => true]);
        $this->project->refresh();
        $response = $this->withHeaders([
            'project-id' => $this->project->uuid,
            'Authorization' => 'Bearer ' . $this->project->createToken('test-token', [])->plainTextToken
        ])->get('/api');
        $response->assertJsonStructure([
            'uuid',
            'name',
            'description',
            'default_locale',
            'locales',
        ]);
        $response->assertStatus(200);
    }
    
    public function test_api_collections_returns_collections()
    {
        $this->project->update(['public_api' => false]);
        $this->project->refresh();
        $response = $this->withHeaders([
            'project-id' => $this->project->uuid,
            'Authorization' => 'Bearer ' . $this->project->createToken('test-token', ['read'])->plainTextToken
        ])->get('/api/collections');

        // Use the helper method to dynamically test collections
        $this->assertCollectionsFromTemplate('blog-next-js', $response);

        $response->assertStatus(200);
    }

    /**
     * Dynamic test that works with any template
     * This test can be easily adapted for different templates
     */
    public function test_api_collections_returns_collections_dynamic()
    {
        // Get all available templates
        $templates = ProjectTemplate::all();
        
        foreach ($templates as $template) {
            $templateSlug = $template->slug;
            
            // Create a project from this template
            $project = self::createProjectFromTemplateStatic($templateSlug, false, ['public_api' => false]); // No demo data for faster testing
            $project->refresh();
            $project->load('collections');
            
            $response = $this->withHeaders([
                'project-id' => $project->uuid,
                'Authorization' => 'Bearer ' . $project->createToken('test-token', ['read'])->plainTextToken
            ])->get('/api/collections');

            // Use the helper method to dynamically test collections
            $this->assertCollectionsFromTemplate($templateSlug, $response);

            // Assert the response structure
            $response->assertJsonStructure([
                '*' => [
                    'uuid',
                    'name',
                    'slug',
                    'is_singleton',
                    'created_at',
                    'updated_at',
                ]
            ]);
            $response->assertStatus(200);
        }
    }

    /**
     * Test that verifies collections with fields are created correctly from template
     */
    public function test_api_collections_with_slug_returns_collection_with_fields()
    {
        $this->project->update(['public_api' => false]);
        $this->project->refresh();
        
        // Get template data to know what collections and fields to expect
        $templateData = $this->getTemplateData('blog-next-js');
        
        // Test each collection from the template
        foreach ($templateData['collections'] as $collectionData) {
            $collectionSlug = $collectionData['slug'];
            $collection = $this->project->collections()->where('slug', $collectionSlug)->first();
            
            $this->assertNotNull($collection, "Collection '{$collectionSlug}' not found in project");
            
            $response = $this->withHeaders([
                'project-id' => $this->project->uuid,
                'Authorization' => 'Bearer ' . $this->project->createToken('test-token', ['read'])->plainTextToken
            ])->get("/api/collections/{$collection->slug}");

            // Use the helper method to dynamically test the collection with fields
            $this->assertCollectionWithFieldsFromTemplate('blog-next-js', $collectionSlug, $response);
        }
    }

    /**
     * Dynamic test that works with any template to test collection with fields endpoint
     */
    public function test_api_collections_with_slug_returns_collection_with_fields_dynamic()
    {
        // Get all available templates
        $templates = ProjectTemplate::all();
        
        foreach ($templates as $template) {
            $templateSlug = $template->slug;
            
            // Create a project from this template
            $project = self::createProjectFromTemplateStatic($templateSlug, false, ['public_api' => false]);
            $project->refresh();
            $project->load('collections');
            
            // Get template data to know what collections to expect
            $templateData = $this->getTemplateData($templateSlug);
            
            // Test each collection from the template
            foreach ($templateData['collections'] as $collectionData) {
                $collectionSlug = $collectionData['slug'];
                $collection = $project->collections()->where('slug', $collectionSlug)->first();
                
                $this->assertNotNull($collection, "Collection '{$collectionSlug}' not found in project for template '{$templateSlug}'");
                
                // Ensure project is refreshed and public_api is set correctly
                $project->refresh();
                $this->assertFalse($project->public_api, "Project public_api should be false for authentication test");
                
                $token = $project->createToken('test-token', ['read'])->plainTextToken;
                
                $response = $this->withHeaders([
                    'project-id' => $project->uuid,
                    'Authorization' => 'Bearer ' . $token
                ])->get("/api/collections/{$collection->slug}");

                // Use the helper method to dynamically test the collection with fields
                $this->assertCollectionWithFieldsFromTemplate($templateSlug, $collectionSlug, $response);
            }
        }
    }
}