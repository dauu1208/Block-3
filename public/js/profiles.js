// Hiện thẻ thông tin khi trượt vào, ẩn lại khi trượt ra (hướng bay theo hướng cuộn)
const show = new IntersectionObserver(entries => {
  entries.forEach(e => {
    const el = e.target;
    if (e.isIntersecting) {
      el.classList.add('in');
      el.classList.remove('above');
    } else {
      el.classList.remove('in');
      el.classList.toggle('above', e.boundingClientRect.top < 0);
    }
  });
}, { threshold: 0.35 });
document.querySelectorAll('.page').forEach(p => show.observe(p));
