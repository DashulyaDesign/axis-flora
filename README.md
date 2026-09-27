# Axis Flora

Landing page for a landscaping studio: volumetric particle flower that turns with the cursor, scroll-triggered animations, fog that the cursor blows away, horizontal glass slides, a "services" title that falls apart into dust under the cursor, infinite services list, order form, cursor-trail projects gallery.

## Run locally

```bash
python3 -m http.server 8000
```
Then open http://localhost:8000.

## Notes

- **NV CHOOM font**: put `NVChoom.woff2` (or `.otf` / `.ttf`) into `fonts/`. Until then Dela Gothic One is used.
- **Order form** sends via [FormSubmit](https://formsubmit.co) to `i@tsypkina-work.ru`. The first submission sends an activation e-mail that must be confirmed once.
- **Project photos** are in `img/projects/01.jpg … 12.jpg`. Replace the files with your own work (landscape 4:3 photos look best), or edit `PROJECT_PHOTOS` in `js/main.js`.
- **Slide photos** are in `img/slides/` (`private.jpg`, `business.jpg`, `events.jpg`).
- **Telegram / Instagram links**: replace the `#` placeholders in `index.html` (marked `TODO`).

## Particle flower

`js/flower.js` samples `1.jpg` into particles. Each particle gets a depth from the part of the flower it belongs to:
- the sepals form a bowl, each one cupped and slightly twisted;
- the white petals point toward the viewer;
- the stamens sit in front;
- the spurs go far back;
- the stem bends in depth;
- the leaves fan out;
- the bud is round.

Extra particles straight behind the visible ones (~12k in total) give every part a body, so it is not flat from the side. From the front it looks exactly like the photo.

## Photo credits

All photos are CC0 (public domain) from [StockSnap.io](https://stocksnap.io) and Wikimedia Commons. No attribution is required; credits are listed here anyway.

| File | Author |
| --- | --- |
| img/slides/private.jpg | Matt Bango |
| img/slides/business.jpg | Marc Mueller |
| img/slides/events.jpg | WDnet Studio |
| img/projects/01.jpg | Daria Nepriakhina |
| img/projects/02.jpg | Joe deSousa |
| img/projects/03.jpg | World Travel Adventures |
| img/projects/04.jpg | Kelly Ishmael |
| img/projects/05.jpg | Hal Ozart (Wikimedia Commons) |
| img/projects/06.jpg | Christopher Gimmer |
| img/projects/07.jpg | Samuel Zeller |
| img/projects/08.jpg | Sweet Ice Cream Photography |
| img/projects/09.jpg | Kelly Ishmael |
| img/projects/10.jpg | Dimitri Tyan |
| img/projects/11.jpg | Daria Nepriakhina |
| img/projects/12.jpg | Jay Mantri |

## Stack

GSAP 3.13 (ScrollTrigger, SplitText) and Lenis, loaded from jsDelivr. No build step.
