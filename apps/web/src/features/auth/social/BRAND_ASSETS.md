# Social authentication brand assets

The provider-owned login images live in `apps/web/public/social-auth` and
`apps/mobile/assets/social-auth`. Do not recolor, redraw, crop further, or
replace them with letter badges.

| Asset | Official source | Applied use |
| --- | --- | --- |
| Apple | Apple Sign in with Apple button image API | Web Apple button logo file, used at its full padded height |
| Google | Google Sign in with Google pre-approved platform asset bundle | Separate iOS and Android/web light-theme icon tiles |
| Kakao | Kakao Developers large Korean login resource | Unmodified Kakao symbol region recomposed on `#FEE500` per the design guide |
| Naver | NAVER Login Korean BI asset bundle | Green-background N icon with the official white mark |

Sources checked on 2026-07-20:

- https://developer.apple.com/design/human-interface-guidelines/sign-in-with-apple
- https://appleid.cdn-apple.com/appleid/button/logo
- https://developers.google.com/identity/branding-guidelines
- https://developers.kakao.com/docs/ko/kakaologin/design-guide
- https://developers.kakao.com/tool/resource/login
- https://developers.naver.com/docs/login/bi/bi.md

Apple mobile login must continue to use `expo-apple-authentication`'s
system-provided button. The other button containers and labels remain code so
full-width responsive layout, focus, disabled, and busy states do not distort
the provider artwork.
