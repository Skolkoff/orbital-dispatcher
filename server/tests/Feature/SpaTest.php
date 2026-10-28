<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\File;
use Tests\TestCase;

class SpaTest extends TestCase
{
    private string $publicDirectory;

    protected function setUp(): void
    {
        parent::setUp();
        $this->publicDirectory = sys_get_temp_dir().'/orbital-spa-'.bin2hex(random_bytes(8));
        File::makeDirectory($this->publicDirectory.'/app', 0755, true);
        File::put($this->publicDirectory.'/app/index.html', '<html>Orbital SPA</html>');
        $this->app->usePublicPath($this->publicDirectory);
    }

    protected function tearDown(): void
    {
        File::deleteDirectory($this->publicDirectory);
        parent::tearDown();
    }

    public function test_root_and_client_routes_serve_the_spa_entry(): void
    {
        foreach (['/', '/course'] as $path) {
            $response = $this->get($path)->assertOk();
            $this->assertSame('<html>Orbital SPA</html>', $response->baseResponse->getFile()->getContent());
        }
    }

    public function test_unknown_api_sanctum_and_asset_routes_do_not_serve_spa_html(): void
    {
        $this->getJson('/api/missing')->assertNotFound();
        $this->get('/sanctum/missing')->assertNotFound();
        $this->get('/app/assets/missing.js')->assertNotFound();
    }
}
