# scripts/

Layihə üçün köməkçi skriptlər.

## zip-project.bat

Layihənin kök qovluğunu zip-ləyir. **İki dəfə click etmək** kifayətdir.

### Daxil EDİLMƏYƏN faylar / qovluqlar

- `node_modules/` (bütün səviyyələrdə — həm `backend/`, həm `frontend/`)
- `.git/`
- `uploads/` (bütün səviyyələrdə)
- `dist/`, `build/`, `.next/`, `out/`, `.cache/`, `coverage/`
- `package-lock.json`
- `.env`, `.env.*` (məsələn `.env.local`, `.env.production` və s.)
- `*.log`, `npm-debug.log*`, `yarn-debug.log*`, `yarn-error.log*`

### Çıxış (output)

ZIP faylı layihənin **bir qovluq yuxarısında** yaranır, məsələn:

```
C:\Users\Elxan\Desktop\projects\dashboard-template_20260520_100000.zip
```

Bu, zip-in özü-özünü daxil etməməsi üçündür.

### Necə istifadə olunur

1. `scripts/zip-project.bat` faylına iki dəfə klik et.
2. Konsol açılacaq, robocopy ilə müvəqqəti qovluğa surət çıxarılacaq, sonra PowerShell-in `Compress-Archive` əmri ilə zip yaradılacaq.
3. Bitəndə zip-in tam yolunu göstərəcək. Pəncərəni bağlamaq üçün hər hansı düyməyə bas.

### İstisnaları dəyişmək

`zip-project.bat` faylında `/XD` (qovluqlar) və `/XF` (fayllar) bölmələrini redaktə et.
