const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
const heroImg = document.getElementById("heroImg");
const demoImg = document.getElementById("demoImg");
const heroBtns = [...document.querySelectorAll("[data-side]")];
const demoBtns = [...document.querySelectorAll("[data-demo]")];
const flipState = new WeakMap();

async function flipCard(image, side, buttons, dataKey) {
  const previous = flipState.get(image);
  previous?.animation?.cancel();
  const current = {};
  flipState.set(image, current);
  const update = () => {
    image.src = side === "back" ? "back.jpg" : "front.jpg";
    image.alt =
      side === "back" ? "QRänduri kaardi tagakülg" : "QRänduri kaardi esikülg";
    buttons.forEach((button) => {
      const selected = button.dataset[dataKey] === side;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  };
  if (motionPreference.matches) {
    update();
    return;
  }
  try {
    current.animation = image.animate(
      [
        { transform: "rotateY(0deg)", filter: "brightness(1)" },
        { transform: "rotateY(90deg)", filter: "brightness(.65)" },
      ],
      { duration: 210, easing: "cubic-bezier(.55,0,1,.45)", fill: "forwards" },
    );
    await current.animation.finished;
    if (flipState.get(image) !== current) return;
    update();
    current.animation.cancel();
    current.animation = image.animate(
      [
        { transform: "rotateY(-90deg)", filter: "brightness(.65)" },
        { transform: "rotateY(0deg)", filter: "brightness(1)" },
      ],
      { duration: 360, easing: "cubic-bezier(.16,1,.3,1)" },
    );
    await current.animation.finished;
  } catch (error) {
    if (error.name !== "AbortError") console.error(error);
  }
}
heroBtns.forEach((button) =>
  button.addEventListener("click", () =>
    flipCard(heroImg, button.dataset.side, heroBtns, "side"),
  ),
);
demoBtns.forEach((button) =>
  button.addEventListener("click", () =>
    flipCard(demoImg, button.dataset.demo, demoBtns, "demo"),
  ),
);

const priceMap = {
  1: "2,50 €",
  5: "10 €",
  10: "18 €",
  25: "40 €",
  50: "75 €",
  100: "135 €",
};
const descMap = {
  1: "1 kaart · 2,50 € / tk · proovimiseks.",
  5: "5 kaarti · 2,00 € / tk · väike komplekt.",
  10: "10 kaarti · 1,80 € / tk · hea alustamiseks sõpradega.",
  25: "25 kaarti · 1,60 € / tk · suurem kollektsioon.",
  50: "50 kaarti · 1,50 € / tk · grupile või klassile.",
  100: "100 kaarti · 1,35 € / tk · suur tellimus.",
};
const qtySelect = document.getElementById("qtySelect");
function chooseQty(quantity) {
  const q = String(quantity);
  if (!(q in priceMap)) return;
  document.querySelectorAll(".package").forEach((option) => {
    const selected = option.dataset.qty === q;
    option.classList.toggle("active", selected);
    option.setAttribute("aria-pressed", String(selected));
  });
  document.getElementById("bigPrice").textContent = priceMap[q];
  document.getElementById("bigDesc").textContent = descMap[q];
  document.getElementById("orderQty").textContent =
    q + (q === "1" ? " kaart" : " kaarti");
  document.getElementById("orderPrice").textContent = priceMap[q];
  document.getElementById("recommendation").hidden = q !== "10";
  qtySelect.value = q;
}
document.querySelectorAll(".package").forEach((option) => {
  option.addEventListener("click", () => chooseQty(option.dataset.qty));
  option.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      chooseQty(option.dataset.qty);
    }
  });
});
qtySelect.addEventListener("change", () => chooseQty(qtySelect.value));

for (const [index, button] of [
  ...document.querySelectorAll(".faqQ"),
].entries()) {
  const item = button.parentElement;
  const answer = item.querySelector(".faqA");
  answer.id = `faq-answer-${index}`;
  button.setAttribute("aria-controls", answer.id);
  button.setAttribute("aria-expanded", String(item.classList.contains("open")));
  button.addEventListener("click", () => {
    const open = item.classList.toggle("open");
    button.setAttribute("aria-expanded", String(open));
  });
}
document.getElementById("orderForm").addEventListener("submit", (event) => {
  event.preventDefault();
  document.getElementById("formNote").textContent =
    "✓ Valik on valmis! See on näidisvorm — tellimust ei saadetud.";
});

const menuBtn = document.getElementById("menuBtn");
const mobileMenu = document.getElementById("mobileMenu");
function closeMobileMenu(returnFocus = false) {
  menuBtn.setAttribute("aria-expanded", "false");
  menuBtn.setAttribute("aria-label", "Ava menüü");
  mobileMenu.classList.remove("open");
  document.body.classList.remove("menuOpen");
  if (returnFocus) menuBtn.focus();
}
menuBtn.addEventListener("click", () => {
  const open = menuBtn.getAttribute("aria-expanded") !== "true";
  mobileMenu.style.top = `${document.querySelector("header").getBoundingClientRect().bottom + 10}px`;
  menuBtn.setAttribute("aria-expanded", String(open));
  menuBtn.setAttribute("aria-label", open ? "Sulge menüü" : "Ava menüü");
  mobileMenu.classList.toggle("open", open);
  document.body.classList.toggle("menuOpen", open);
});
mobileMenu
  .querySelectorAll("a")
  .forEach((link) => link.addEventListener("click", () => closeMobileMenu()));
document.addEventListener("keydown", (event) => {
  if (menuBtn.getAttribute("aria-expanded") !== "true") return;
  if (event.key === "Escape") {
    closeMobileMenu(true);
    return;
  }
  if (event.key === "Tab") {
    const focusable = [menuBtn, ...mobileMenu.querySelectorAll("a")];
    const index = focusable.indexOf(document.activeElement);
    if (event.shiftKey && index <= 0) {
      event.preventDefault();
      focusable.at(-1).focus();
    } else if (
      !event.shiftKey &&
      (index === focusable.length - 1 || index === -1)
    ) {
      event.preventDefault();
      menuBtn.focus();
    }
  }
});
document.addEventListener("click", (event) => {
  if (!mobileMenu.contains(event.target) && !menuBtn.contains(event.target))
    closeMobileMenu();
});
window.addEventListener("resize", () => {
  if (window.innerWidth > 980) closeMobileMenu();
});

if ("IntersectionObserver" in window) {
  const revealElements = document.querySelectorAll(
    ".sectionTitle, .sectionIntro, .step, .lab, .packArena, .routeItem, .pricingWrap, .aboutBlock, .orderBox",
  );
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.08 },
  );
  revealElements.forEach((element) => {
    element.classList.add("reveal");
    revealObserver.observe(element);
  });
  if (!motionPreference.matches)
    document.documentElement.classList.add("motionReady");
  motionPreference.addEventListener("change", (event) =>
    document.documentElement.classList.toggle("motionReady", !event.matches),
  );
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        document
          .querySelectorAll(".links a")
          .forEach((link) =>
            link.classList.toggle(
              "active",
              link.hash === `#${entry.target.id}`,
            ),
          );
      });
    },
    { rootMargin: "-20% 0px -55% 0px" },
  );
  document
    .querySelectorAll("main section[id]")
    .forEach((section) => sectionObserver.observe(section));
}

const floatingCta = document.querySelector(".mobileCta");
let scrollPending = false;
function updateScroll() {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  document.documentElement.style.setProperty(
    "--scroll-progress",
    maxScroll > 0 ? window.scrollY / maxScroll : 0,
  );
  const heroBottom = document
    .querySelector(".hero")
    .getBoundingClientRect().bottom;
  const orderRect = document.getElementById("telli").getBoundingClientRect();
  floatingCta.classList.toggle(
    "visible",
    heroBottom < 0 &&
      !(orderRect.top < window.innerHeight && orderRect.bottom > 0),
  );
  scrollPending = false;
}
window.addEventListener(
  "scroll",
  () => {
    if (!scrollPending) {
      scrollPending = true;
      requestAnimationFrame(updateScroll);
    }
  },
  { passive: true },
);
window.addEventListener("resize", updateScroll);
updateScroll();

const heroCard = document.querySelector(".heroCard");
const heroVisual = document.querySelector(".heroVisual");
heroVisual.addEventListener("pointermove", (event) => {
  if (motionPreference.matches || event.pointerType !== "mouse") return;
  const rect = heroVisual.getBoundingClientRect();
  heroCard.style.setProperty(
    "--tilt-x",
    `${((event.clientX - rect.left) / rect.width - 0.5) * 12}deg`,
  );
  heroCard.style.setProperty(
    "--tilt-y",
    `${-((event.clientY - rect.top) / rect.height - 0.5) * 10}deg`,
  );
});
heroVisual.addEventListener("pointerleave", () => {
  heroCard.style.setProperty("--tilt-x", "0deg");
  heroCard.style.setProperty("--tilt-y", "0deg");
});
