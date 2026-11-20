/* GROW member log out.
   Any element with data-grow-logout clears the GROW gateway session
   and returns to the login page. Anything a member has written on a
   page stays on their device. */
(function () {
  function logout(e) {
    e.preventDefault();
    if (!window.confirm('Log out of GROW?\n\nYou\'ll need your password to get back in.')) return;
    ['grow_nomads_club', 'grow_nomads_role'].forEach(function (k) {
      try { localStorage.removeItem(k); } catch (err) { /* ignore */ }
    });
    window.location.href = '/grow-login';
  }
  function bind() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-grow-logout]'), function (el) {
      el.addEventListener('click', logout);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
