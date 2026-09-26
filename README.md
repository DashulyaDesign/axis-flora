# Axis Flora

Landing page for a landscaping studio — particle flower hero, scroll-triggered animations, horizontal slides, infinite services list, order form, cursor-trail projects gallery.

## Run locally

```bash
python3 -m http.server 8000
```
Then open http://localhost:8000

## Notes

- **NV CHOOM font** — put `NVChoom.woff2` (or `.otf` / `.ttf`) into `fonts/`. Until then Dela Gothic One is used.
- **Order form** sends via [FormSubmit](https://formsubmit.co) to `i@tsypkina-work.ru`. The first submission sends an activation e-mail that must be confirmed once. Works only when the site is served over http(s), not from `file://`.
- **Project photos** — add paths to `PROJECT_PHOTOS` in `js/main.js`; generated placeholder cards are used while it is empty.
- **Telegram / Instagram links** — replace the `#` placeholders in `index.html` (marked `TODO`).

## Stack

GSAP 3.13 (ScrollTrigger, SplitText), Lenis — loaded from jsDelivr. No build step.
