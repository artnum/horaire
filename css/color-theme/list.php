<?php
/**
 * List available color themes from this directory (*.css).
 * Used by the app theme selector for a dynamic inventory of themes.
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, no-store, must-revalidate');

$dir = __DIR__;
$themes = [];

foreach ([$dir . '/color.css', $dir . '/color-dark.css'] as $path) {
    if (!is_readable($path)) {
        continue;
    }
    $id = basename($path, '.css');
    if ($id === '' || $id[0] === '.') {
        continue;
    }
    $themes[] = [
        'id' => $id,
        'label' => theme_label($id),
        'file' => $id . '.css',
    ];
}

usort($themes, static function (array $a, array $b): int {
    return strcasecmp($a['label'], $b['label']);
});

echo json_encode(['data' => $themes], JSON_UNESCAPED_UNICODE);

/**
 * Human-readable label from a theme id (filename without extension).
 */
function theme_label(string $id): string
{
    $spaced = preg_replace('/[_\-]+/', ' ', $id) ?? $id;
    return mb_convert_case($spaced, MB_CASE_TITLE, 'UTF-8');
}
