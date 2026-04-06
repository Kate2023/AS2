/* main.js
   Interactivity + extra validation using jQuery (as required).
   This is a front-end prototype: totals are stored in localStorage.
*/

(function () {
  const STORAGE_KEY = "aag_cart_state_v1";

  function money(n) {
    return (Math.round((Number(n) + Number.EPSILON) * 100) / 100).toFixed(2);
  }

  function loadCartState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        // default: two items as per wireframe $300 + $300
        items: [
          { price: 300, qty: 1 },
          { price: 300, qty: 1 }
        ],
        coupon: null
      };
    }
    try { return JSON.parse(raw); } catch { return { items: [], coupon: null }; }
  }

  function saveCartState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function getSubtotal(state) {
    return state.items.reduce((sum, it) => sum + (Number(it.price) * Number(it.qty)), 0);
  }

  // Simple tax model for prototype
  function calcTaxes(subtotal) {
    // Keeps totals in same "style" as wireframe; not real GST logic
    return subtotal > 0 ? 13 : 0;
  }

  function calcShipping(subtotal) {
    // Used for shipping offer: free over 600
    return subtotal >= 600 ? 0 : 25;
  }

  function updateCartCountBadge() {
    const state = loadCartState();
    const count = state.items.reduce((n, it) => n + Number(it.qty || 0), 0);
    $("#cartCount").text(count);
  }

  // Fancy floating anchor: show after scroll, smooth scroll to top
  function initFloatingAnchor() {
    const $btn = $("#floatingAnchor");
    if (!$btn.length) return;

    function onScroll() {
      if (window.scrollY > 350) $btn.addClass("is-visible");
      else $btn.removeClass("is-visible");
    }
    window.addEventListener("scroll", onScroll);
    onScroll();

    $btn.on("click", function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  // Newsletter: HTML5 + jQuery email check
  function initNewsletterForms() {
    function bind(formSel, emailSel, successSel) {
      const $form = $(formSel);
      if (!$form.length) return;

      $form.on("submit", function (e) {
        e.preventDefault();

        const $email = $(emailSel);
        const email = ($email.val() || "").toString().trim();

        // Basic robust email regex (not perfect but better than HTML5 alone)
        const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);

        if (!email || !ok) {
          $email.addClass("is-invalid").removeClass("is-valid");
          $(successSel).addClass("d-none");
          return;
        }

        $email.removeClass("is-invalid").addClass("is-valid");
        $(successSel).removeClass("d-none");
        $form[0].reset();
        $email.removeClass("is-valid");
      });
    }

    bind("#newsletterForm", "#newsletterEmail", "#newsletterSuccess");
    bind("#newsletterFormShop", "#newsletterEmailShop", "#newsletterSuccessShop");
  }


  // Coupon: allow only letters/numbers 3-12 (shared across pages)
  function initCouponForm() {
    const $form = $("#couponForm");
    if (!$form.length) return;

    $form.on("submit", function (e) {
      e.preventDefault();

      const $code = $("#couponCode");
      const code = ($code.val() || "").toString().trim().toUpperCase();
      const ok = /^[A-Z0-9]{3,12}$/.test(code);

      if (!code) {
        $code.removeClass("is-invalid is-valid");
        $("#couponApplied").addClass("d-none");

        // optional: store in state for prototype consistency
        const state = loadCartState();
        state.coupon = null;
        saveCartState(state);

        return;
      }

      if (!ok) {
        $code.addClass("is-invalid").removeClass("is-valid");
        $("#couponApplied").addClass("d-none");
        return;
      }

      $code.removeClass("is-invalid").addClass("is-valid");
      $("#couponApplied").removeClass("d-none");

      const state = loadCartState();
      state.coupon = code;
      saveCartState(state);

      setTimeout(() => $code.removeClass("is-valid"), 900);
    });
  }

  // Add-to-cart buttons on shop + product page
  function initAddToCartButtons() {
    $(".js-add-to-cart").on("click", function () {
      const price = Number($(this).data("price") || 0);
      if (!(price > 0)) return;

      const state = loadCartState();
      state.items.push({ price, qty: 1 });
      saveCartState(state);
      updateCartCountBadge();
    });

    $("#productForm").on("submit", function (e) {
      e.preventDefault();

      const model = $("#modelSelect").val();
      const qty = Number($("#qty").val());

      // Validate with both HTML constraints and JS constraints
      let ok = true;

      if (!model) {
        $("#modelSelect").addClass("is-invalid");
        ok = false;
      } else {
        $("#modelSelect").removeClass("is-invalid");
      }

      if (!(qty >= 1 && qty <= 99)) {
        $("#qty").addClass("is-invalid");
        ok = false;
      } else {
        $("#qty").removeClass("is-invalid");
      }

      if (!ok) return;

      const price = Number($("#productPrice").text() || 0);
      const state = loadCartState();
      state.items.push({ price, qty });
      saveCartState(state);
      updateCartCountBadge();

      window.location.href = "cart.html";
    });
  }

  // Cart totals + coupon validation + qty validation (JS functionality #4)
  function initCartPage() {
    if (!$(".cart-item").length) return;

    const state = loadCartState();

    // Hydrate quantities from storage (if number of DOM items differs, map by index)
    $(".cart-item").each(function (idx) {
      const it = state.items[idx];
      const $qty = $(this).find(".js-qty");
      if (it && $qty.length) $qty.val(it.qty);
    });

    function renderSummary() {
      const subtotal = getSubtotal(state);
      const taxes = calcTaxes(subtotal);
      const shipping = 0; // wireframe shows FREE on cart; actual offer enforced on shipping page
      const total = subtotal + taxes + shipping;

      $("#summarySubtotal").text(money(subtotal));
      $("#summaryTaxes").text(money(taxes));
      $("#summaryShippingLabel").text(shipping === 0 ? "FREE" : `$${money(shipping)}`);
      $("#summaryTotal").text(money(total));
    }

    // Qty changes
    $(".js-qty").on("input change", function () {
      const $input = $(this);
      const qty = Number($input.val());
      const $item = $input.closest(".cart-item");
      const idx = $(".cart-item").index($item);

      if (!(qty >= 1 && qty <= 99)) {
        $input.addClass("is-invalid");
        return;
      }
      $input.removeClass("is-invalid");

      if (state.items[idx]) {
        state.items[idx].qty = qty;
        saveCartState(state);
        updateCartCountBadge();
        renderSummary();
      }
    });

    $("#cancelCart").on("click", function () {
      // clear for prototype
      localStorage.removeItem(STORAGE_KEY);
      updateCartCountBadge();
      window.location.href = "shop.html";
    });

    // initial render
    renderSummary();
  }

  // Shipping page: offer free shipping automatically over $600 (required JS element #3)
  function initShippingPage() {
    if (!$("#shippingForm").length) return;

    const state = loadCartState();
    const subtotal = getSubtotal(state);
    const taxes = calcTaxes(subtotal);
    const shipping = calcShipping(subtotal);
    const total = subtotal + taxes + shipping;

    $("#shipSubtotal").text(money(subtotal));
    $("#shipTaxes").text(money(taxes));
    $("#shipShippingLabel").text(shipping === 0 ? "FREE" : `$${money(shipping)}`);
    $("#shipTotal").text(money(total));

    const remaining = Math.max(0, 600 - subtotal);
    $("#remainingForFreeShipping").text(money(remaining));

    // Update banner text based on eligibility
    if (subtotal >= 600) {
      $("#freeShippingBanner")
        .removeClass("alert-info")
        .addClass("alert-success")
        .html('<strong>Congratulations!</strong> Your order qualifies for <strong>FREE shipping</strong> (subtotal $600+).');
    }

    // jQuery extra validation beyond HTML5
    $("#shippingForm").on("submit", function (e) {
      e.preventDefault();

      let ok = true;

      // NZ postcode: 4 digits
      const postcode = ($("#postcode").val() || "").toString().trim();
      if (!/^\d{4}$/.test(postcode)) {
        $("#postcode").addClass("is-invalid");
        ok = false;
      } else {
        $("#postcode").removeClass("is-invalid");
      }



      // HTML5 constraint check too
      if (!this.checkValidity()) {
        $(this).addClass("was-validated");
        ok = false;
      }

      if (!ok) return;

      window.location.href = "payment.html";
    });
  }

  // Payment page: jQuery validation (card number length, expiryMMYY, CVV)
  function initPaymentPage() {
    if (!$("#paymentForm").length) return;

    const state = loadCartState();
    const subtotal = getSubtotal(state);
    const taxes = calcTaxes(subtotal);
    const shipping = calcShipping(subtotal);
    const total = subtotal + taxes + shipping;

    $("#paySubtotal").text(money(subtotal));
    $("#payTaxes").text(money(taxes));
    $("#payShippingLabel").text(shipping === 0 ? "FREE" : `$${money(shipping)}`);
    $("#payTotal").text(money(total));

    function digitsOnly(s) {
      return (s || "").toString().replace(/\D/g, "");
    }

    $("#paymentForm").on("submit", function (e) {
      e.preventDefault();

      let ok = true;

      const payMethod = $("input[name='payMethod']:checked").val();

      // If PayPal selected, skip card field validation (UI stays same)
      if (payMethod === "paypal") {
        $("#paymentSuccess").removeClass("d-none");
        return;
      }

      // Card number: 13-19 digits
      const cn = digitsOnly($("#cardNumber").val());
      if (!(cn.length >= 13 && cn.length <= 19)) {
        $("#cardNumber").addClass("is-invalid");
        ok = false;
      } else {
        $("#cardNumber").removeClass("is-invalid");
      }

      // Expiry: must be in the future (valid through end of expiry month)
      // Accepts: "MM/YY", "MM / YY", "MMYY"
      const rawExp = ($("#expMMYY").val() || "").toString().trim();
      const expDigits = rawExp.replace(/\D/g, ""); // keep digits only

      let expOk = true;

      if (expDigits.length !== 4) {
        expOk = false;
      } else {
        const mm = Number(expDigits.slice(0, 2));
        const yy = Number(expDigits.slice(2, 4));

        if (!(mm >= 1 && mm <= 12)) {
          expOk = false;
        } else {
          // Interpret YY as 20YY (prototype assumption)
          const yyyy = 2000 + yy;

          // Card is typically valid until the end of the expiry month.
          // So we compare NOW with the first day of the month AFTER expiry.
          const firstOfNextMonth = new Date(yyyy, mm, 1); // month is 1-based here intentionally (mm), JS rolls over
          const now = new Date();

          if (!(firstOfNextMonth > now)) {
            expOk = false;
          }
        }
      }

      if (!expOk) {
        $("#expMMYY").addClass("is-invalid");
        ok = false;
      } else {
        $("#expMMYY").removeClass("is-invalid");
      }


      // CVV: 3-4 digits
      const cvv = digitsOnly($("#cvv").val());
      if (!(cvv.length === 3 || cvv.length === 4)) {
        $("#cvv").addClass("is-invalid");
        ok = false;
      } else {
        $("#cvv").removeClass("is-invalid");
      }

      if (!this.checkValidity()) {
        $(this).addClass("was-validated");
        ok = false;
      }

      if (!ok) return;

      $("#paymentSuccess").removeClass("d-none");

    });
  }

  // Basic search forms (prevent empty submit)
  function initSearchForms() {
    $("#shopSearchForm, #homeSearchForm").on("submit", function (e) {
      const $input = $(this).find("input[type='search']");
      const q = ($input.val() || "").toString().trim();
      if (!q) {
        e.preventDefault();
        $input.addClass("is-invalid");
        setTimeout(() => $input.removeClass("is-invalid"), 800);
      }
    });
  }

  // Initialize
  $(function () {
    updateCartCountBadge();
    initFloatingAnchor();
    initNewsletterForms();
    initSearchForms();
    initAddToCartButtons();
    initCouponForm();
    initCartPage();
    initShippingPage();
    initPaymentPage();
  });
})();