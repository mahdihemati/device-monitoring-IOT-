<?php

namespace App\Services\Telemetry;

class TopicDeviceCodeExtractor
{
    public function extract(?string $topic): ?string
    {
        if (! filled($topic)) {
            return null;
        }

        $topic = trim($topic);
        $customRegex = config('mqtt.device_code_topic_regex');

        if (filled($customRegex)) {
            $deviceCode = $this->extractWithRegex($topic, (string) $customRegex);

            if ($deviceCode !== null) {
                return $deviceCode;
            }
        }

        foreach ((array) config('mqtt.device_code_topic_patterns', []) as $pattern) {
            $deviceCode = $this->extractWithPattern($topic, (string) $pattern);

            if ($deviceCode !== null) {
                return $deviceCode;
            }
        }

        return null;
    }

    private function extractWithRegex(string $topic, string $regex): ?string
    {
        if (@preg_match($regex, $topic, $matches) !== 1) {
            return null;
        }

        $value = $matches['device_code'] ?? $matches[1] ?? null;

        return filled($value) ? trim((string) $value) : null;
    }

    private function extractWithPattern(string $topic, string $pattern): ?string
    {
        $pattern = str_replace('{device_code}', '__DEVICE_CODE__', trim($pattern));
        $pattern = (string) preg_replace('#\{[A-Za-z0-9_]+\}#', '__SEGMENT__', $pattern);
        $quoted = preg_quote($pattern, '#');
        $quoted = str_replace(['__DEVICE_CODE__', '__SEGMENT__'], ['([^/]+)', '[^/]+'], $quoted);
        $regex = '#^'.$quoted.'$#';

        if (preg_match($regex, $topic, $matches) !== 1) {
            return null;
        }

        return filled($matches[1] ?? null) ? trim((string) $matches[1]) : null;
    }
}
