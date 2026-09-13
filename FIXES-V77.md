# V77 stability fixes

- Keeps the V76 mobile client fix: first tap reveals client details, second tap follows the link.
- Splinter / OTP featured cards: removes nested 3D compositing on desktop and uses a stable opacity crossfade.
- Featured reels pause while hidden and resume on hover/focus.
- Featured client cards are excluded from the global 3D tilt handler.
- Portfolio entrance transform animation is disabled on Safari to avoid WebKit repaint issues in CSS multi-column masonry.
- Initial portfolio cards are explicitly eager-loaded (up to 60); larger views keep later images lazy.
- No portfolio data or visual assets were removed.
