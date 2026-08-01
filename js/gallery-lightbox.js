(function () {
  'use strict';

  function init() {
    var lightbox = document.getElementById('gallery-lightbox');
    var lightboxImg = document.getElementById('gallery-lightbox-img');
    var closeBtn = document.getElementById('gallery-lightbox-close');
    var thumbs = document.querySelectorAll('.gallery-thumb');

    if (!lightbox || !lightboxImg || !closeBtn || !thumbs.length) return;

    function openLightbox(src, alt) {
      lightboxImg.src = src;
      lightboxImg.alt = alt || '';
      lightbox.classList.remove('gallery-lightbox-hidden');
    }

    function closeLightbox() {
      lightbox.classList.add('gallery-lightbox-hidden');
      lightboxImg.src = '';
    }

    thumbs.forEach(function (thumb) {
      thumb.addEventListener('click', function () {
        var full = thumb.getAttribute('data-full') || thumb.src;
        openLightbox(full, thumb.alt);
      });
    });

    closeBtn.addEventListener('click', closeLightbox);

    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) closeLightbox();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeLightbox();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
