<!doctype html>
<html lang="fa" dir="rtl">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">
        <meta name="description" content="پایش یخچال‌های نگهداری خون، سنسورها، وضعیت درب، وضعیت PF، هشدارها و تاریخچه.">
        <meta name="theme-color" content="#0f172a">
        <meta name="mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-title" content="پایش خون">
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">

        <title>داشبورد پایش یخچال‌های خون</title>
        <link rel="manifest" href="/manifest.webmanifest">
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png">
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">

        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/main.tsx'])
    </head>
    <body dir="rtl">
        <div id="root"></div>
    </body>
</html>
