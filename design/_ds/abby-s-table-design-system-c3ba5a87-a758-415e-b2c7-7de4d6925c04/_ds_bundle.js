/* @ds-bundle: {"format":3,"namespace":"AbbySTableDesignSystem_c3ba5a","components":[{"name":"Logo","sourcePath":"components/brand/Logo.jsx"},{"name":"DishCard","sourcePath":"components/content/DishCard.jsx"},{"name":"Eyebrow","sourcePath":"components/content/Eyebrow.jsx"},{"name":"NutritionTag","sourcePath":"components/content/NutritionTag.jsx"},{"name":"SectionHeading","sourcePath":"components/content/SectionHeading.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"FilterPill","sourcePath":"components/core/FilterPill.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"EmailSignup","sourcePath":"components/forms/EmailSignup.jsx"},{"name":"NavLink","sourcePath":"components/navigation/NavLink.jsx"},{"name":"TopBar","sourcePath":"components/navigation/TopBar.jsx"}],"sourceHashes":{"components/brand/Logo.jsx":"a3885ac29f1e","components/content/DishCard.jsx":"d3bcf0440fb3","components/content/Eyebrow.jsx":"725290636607","components/content/NutritionTag.jsx":"ea1c990e95a4","components/content/SectionHeading.jsx":"a49e03847862","components/core/Button.jsx":"4ee2102fe0a7","components/core/FilterPill.jsx":"c35a22bbfdb5","components/core/IconButton.jsx":"2bd48f04e4ef","components/forms/EmailSignup.jsx":"2ca4c6c3820e","components/navigation/NavLink.jsx":"b32f7869b934","components/navigation/TopBar.jsx":"debd7360194d","ui_kits/mobile/MobileChrome.jsx":"584d9be68077","ui_kits/mobile/MobileSections.jsx":"c2ceb2d61e48","ui_kits/website/Dishes.jsx":"8d0e35faa6f1","ui_kits/website/Footer.jsx":"8e0d85b4e1fd","ui_kits/website/Header.jsx":"eb413d5e8889","ui_kits/website/Hero.jsx":"3290f40b3349","ui_kits/website/Story.jsx":"84b72c149e0d"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.AbbySTableDesignSystem_c3ba5a = window.AbbySTableDesignSystem_c3ba5a || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/brand/Logo.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Abby's Table wordmark. The source SVG paints with currentColor, so this
 * renders it as a CSS mask filled with the chosen `color` — letting one asset
 * sit on both light and dark grounds. Provide `src` as the path to logo.svg
 * relative to your page (e.g. "assets/logo.svg").
 */
function Logo({
  src = "assets/logo.svg",
  color = "var(--green-forest)",
  height = 40,
  withMark = true,
  label = "Abby's Table",
  style = {},
  ...rest
}) {
  const width = height * (236.735 / 40.125);
  return /*#__PURE__*/React.createElement("span", _extends({
    role: "img",
    "aria-label": label,
    className: "at-logo",
    style: {
      display: "inline-flex",
      alignItems: "flex-start",
      gap: height * 0.1,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "block",
      width,
      height,
      background: color,
      WebkitMaskImage: `url("${src}")`,
      maskImage: `url("${src}")`,
      WebkitMaskRepeat: "no-repeat",
      maskRepeat: "no-repeat",
      WebkitMaskSize: "contain",
      maskSize: "contain"
    }
  }), withMark && /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      fontFamily: "var(--font-sans)",
      fontWeight: "var(--weight-medium)",
      fontSize: height * 0.55,
      lineHeight: 1,
      letterSpacing: "0.1em",
      color,
      marginTop: height * 0.05
    }
  }, "\xAE"));
}
Object.assign(__ds_scope, { Logo });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/Logo.jsx", error: String((e && e.message) || e) }); }

// components/content/Eyebrow.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Eyebrow / kicker label. Uppercase Figtree with the brand's signature
 * wide tracking, set in brass by default. Sits above section headings.
 * tone "brass" (default), "green", "blush" (on dark), "muted".
 */
function Eyebrow({
  children,
  tone = "brass",
  align = "left",
  as = "p",
  style = {},
  ...rest
}) {
  const tones = {
    brass: "var(--brass)",
    green: "var(--green-forest)",
    blush: "var(--blush)",
    muted: "var(--taupe)"
  };
  const Tag = as;
  return /*#__PURE__*/React.createElement(Tag, _extends({
    className: "at-eyebrow",
    style: {
      margin: 0,
      fontFamily: "var(--font-sans)",
      fontWeight: "var(--weight-medium)",
      fontSize: "var(--eyebrow-sm)",
      letterSpacing: "var(--track-eyebrow)",
      textTransform: "uppercase",
      color: tones[tone],
      textAlign: align,
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Eyebrow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/Eyebrow.jsx", error: String((e && e.message) || e) }); }

// components/content/NutritionTag.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Nutrition tag — a small colored dot followed by a wide-tracked label,
 * used in the dish cards (Protein 32g · Carbs 18g · Fat 18g · Calories 520).
 * `dot` sets the marker color; defaults cycle through the brand accents.
 */
const DOTS = {
  protein: "var(--terracotta)",
  carbs: "var(--brass)",
  fat: "var(--taupe)",
  calories: "var(--green-forest)"
};
function NutritionTag({
  children,
  dot = "protein",
  style = {},
  ...rest
}) {
  const color = DOTS[dot] || dot;
  return /*#__PURE__*/React.createElement("span", _extends({
    className: "at-nutrition-tag",
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "8px",
      fontFamily: "var(--font-sans)",
      fontWeight: "var(--weight-medium)",
      fontSize: "var(--body-xs)",
      letterSpacing: "var(--track-wide)",
      color: "var(--brown)",
      whiteSpace: "nowrap",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      width: 8,
      height: 8,
      borderRadius: "50%",
      background: color,
      flex: "0 0 auto"
    }
  }), children);
}
Object.assign(__ds_scope, { NutritionTag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/NutritionTag.jsx", error: String((e && e.message) || e) }); }

// components/content/DishCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Dish card — the brand's signature menu tile. A rounded photo sits above a
 * sand-colored panel carrying a Playfair title, an optional supporting line,
 * and a wrapping row of nutrition tags.
 *
 * @startingPoint section="Content" subtitle="Menu dish tile with photo + macros" viewport="320x420"
 */
function DishCard({
  image,
  title,
  description,
  nutrition = [],
  width = 300,
  style = {},
  ...rest
}) {
  return /*#__PURE__*/React.createElement("article", _extends({
    className: "at-dish-card",
    style: {
      width,
      borderRadius: "var(--radius-card)",
      background: "var(--surface-card)",
      overflow: "hidden",
      boxShadow: "var(--shadow-card)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 220,
      background: image ? `url("${image}") center / cover no-repeat` : "var(--green-mist)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "22px 18px 24px",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontFamily: "var(--font-display)",
      fontWeight: "var(--weight-medium)",
      fontSize: "var(--display-3)",
      lineHeight: 1.3,
      letterSpacing: "var(--track-wide)",
      color: "var(--green-forest)"
    }
  }, title), description && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "12px 0 0",
      fontFamily: "var(--font-sans)",
      fontWeight: "var(--weight-regular)",
      fontSize: "var(--body-sm)",
      lineHeight: 1.5,
      letterSpacing: "var(--track-wide)",
      color: "var(--taupe)"
    }
  }, description), nutrition.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: "10px 16px",
      marginTop: "18px"
    }
  }, nutrition.map((n, i) => /*#__PURE__*/React.createElement(__ds_scope.NutritionTag, {
    key: i,
    dot: n.dot
  }, n.label)))));
}
Object.assign(__ds_scope, { DishCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/DishCard.jsx", error: String((e && e.message) || e) }); }

// components/content/SectionHeading.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Display heading in Playfair Display. Pairs with an optional Eyebrow.
 * level 1 = section title (48px), 2 = promo (40px), 3 = card title (22px),
 * hero = 55px. tone controls color for light vs dark grounds.
 */
function SectionHeading({
  children,
  level = 1,
  tone = "green",
  align = "left",
  as,
  style = {},
  ...rest
}) {
  const sizes = {
    hero: "var(--display-hero)",
    1: "var(--display-1)",
    2: "var(--display-2)",
    3: "var(--display-3)"
  };
  const tones = {
    green: "var(--green-forest)",
    cream: "var(--cream-2)",
    blush: "var(--blush)",
    terracotta: "var(--terracotta)",
    brown: "var(--brown)"
  };
  const Tag = as || (level === 3 ? "h3" : level === 1 || level === "hero" ? "h2" : "h2");
  return /*#__PURE__*/React.createElement(Tag, _extends({
    className: "at-heading",
    style: {
      margin: 0,
      fontFamily: "var(--font-display)",
      fontWeight: "var(--weight-medium)",
      fontSize: sizes[level],
      lineHeight: "var(--line-display)",
      letterSpacing: "var(--track-display)",
      color: tones[tone],
      textAlign: align,
      textWrap: "balance",
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { SectionHeading });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/SectionHeading.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Abby's Table primary button. A fully-rounded pill with wide-tracked,
 * semibold Figtree label. Variants map to the brand's real CTAs:
 *  - primary   → terracotta fill, white text (hero "View the menu", "Order")
 *  - dark      → forest-green fill, white text (filter "All dishes")
 *  - outline   → 1px forest hairline, no fill ("Build a gift box")
 *  - outline-brass → 1px brass hairline on dark grounds ("Request a consultation")
 *  - outline-light → 1px cream hairline on dark grounds
 */
function Button({
  children,
  variant = "primary",
  size = "md",
  type = "button",
  disabled = false,
  onClick,
  style = {},
  ...rest
}) {
  const sizes = {
    sm: {
      padding: "9px 22px",
      fontSize: "var(--btn-size-sm)",
      letterSpacing: "var(--track-wide)"
    },
    md: {
      padding: "13px 30px",
      fontSize: "var(--btn-size)",
      letterSpacing: "0"
    },
    lg: {
      padding: "15px 36px",
      fontSize: "var(--btn-size)",
      letterSpacing: "var(--track-wide)"
    }
  };
  const variants = {
    primary: {
      background: "var(--action-primary)",
      color: "var(--white)",
      border: "1px solid transparent"
    },
    dark: {
      background: "var(--action-dark)",
      color: "var(--white)",
      border: "1px solid transparent"
    },
    outline: {
      background: "transparent",
      color: "var(--green-forest)",
      border: "1px solid var(--green-forest)"
    },
    "outline-brass": {
      background: "transparent",
      color: "var(--text-on-dark)",
      border: "1px solid var(--brass)"
    },
    "outline-light": {
      background: "transparent",
      color: "var(--text-on-dark)",
      border: "1px solid var(--text-on-dark)"
    }
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    disabled: disabled,
    onClick: onClick,
    className: "at-button",
    "data-variant": variant,
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
      fontFamily: "var(--font-sans)",
      fontWeight: "var(--weight-semibold)",
      lineHeight: 1,
      borderRadius: "var(--radius-pill)",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      whiteSpace: "nowrap",
      transition: "filter .18s ease, transform .12s ease, background .18s ease",
      ...sizes[size],
      ...variants[variant],
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/FilterPill.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Filter chip used in the dishes filter row. When `active`, fills with
 * forest green and white text; otherwise a hairline outline pill on cream.
 * Wide letter-tracking and semibold Figtree, matching the brand's chips.
 */
function FilterPill({
  children,
  active = false,
  onClick,
  style = {},
  ...rest
}) {
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    onClick: onClick,
    "aria-pressed": active,
    className: "at-filter-pill",
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "9px 18px",
      fontFamily: "var(--font-sans)",
      fontWeight: "var(--weight-semibold)",
      fontSize: "var(--body-sm)",
      letterSpacing: "var(--track-wide)",
      lineHeight: 1,
      borderRadius: "var(--radius-pill)",
      cursor: "pointer",
      whiteSpace: "nowrap",
      transition: "background .18s ease, color .18s ease, border-color .18s ease",
      background: active ? "var(--green-forest)" : "transparent",
      color: active ? "var(--white)" : "var(--brown)",
      border: active ? "1px solid var(--green-forest)" : "1px solid var(--border-light)",
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { FilterPill });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/FilterPill.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Circular icon button — used for the dishes carousel chevrons.
 * tone "dark" = filled forest green with white glyph (next);
 * tone "light" = cream fill with hairline border and dark glyph (prev).
 * Pass an SVG/character as children, or use the built-in `arrow` prop.
 */
function IconButton({
  children,
  tone = "light",
  size = 42,
  arrow,
  label,
  onClick,
  disabled = false,
  style = {},
  ...rest
}) {
  const tones = {
    dark: {
      background: "var(--green-forest)",
      color: "var(--white)",
      border: "1px solid transparent"
    },
    light: {
      background: "var(--surface-bright)",
      color: "var(--brown)",
      border: "1px solid var(--border-light)"
    },
    blush: {
      background: "var(--blush)",
      color: "var(--green-forest)",
      border: "1px solid transparent"
    }
  };
  const Arrow = ({
    dir
  }) => /*#__PURE__*/React.createElement("svg", {
    width: Math.round(size * 0.38),
    height: Math.round(size * 0.38),
    viewBox: "0 0 16 16",
    fill: "currentColor",
    style: {
      transform: dir === "left" ? "scaleX(-1)" : "none"
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M 9.946 8 L 0 1.867 L 3.027 0 L 16 8 L 3.027 16 L 0 14.133 L 9.946 8 Z"
  }));
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    "aria-label": label,
    onClick: onClick,
    disabled: disabled,
    className: "at-icon-button",
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: size,
      height: size,
      borderRadius: "var(--radius-pill)",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.45 : 1,
      transition: "filter .18s ease, transform .12s ease",
      ...tones[tone],
      ...style
    }
  }, rest), arrow ? /*#__PURE__*/React.createElement(Arrow, {
    dir: arrow
  }) : children);
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/forms/EmailSignup.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Newsletter email field — the footer "Join the table" input. A pill with a
 * hairline border and a brass "Join" button fused to its right edge.
 * tone "dark" for green/footer grounds (default), "light" for cream grounds.
 */
function EmailSignup({
  placeholder = "Enter your email address",
  buttonLabel = "Join",
  tone = "dark",
  onSubmit,
  width = 320,
  style = {},
  ...rest
}) {
  const isDark = tone === "dark";
  const handle = e => {
    e.preventDefault();
    const value = e.currentTarget.elements.email?.value || "";
    onSubmit && onSubmit(value);
  };
  return /*#__PURE__*/React.createElement("form", _extends({
    onSubmit: handle,
    className: "at-email-signup",
    style: {
      display: "flex",
      alignItems: "stretch",
      width,
      height: 44,
      borderRadius: "var(--radius-pill)",
      border: `1px solid ${isDark ? "var(--green-mid)" : "var(--border-light)"}`,
      overflow: "hidden",
      background: "transparent",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("input", {
    name: "email",
    type: "email",
    placeholder: placeholder,
    style: {
      flex: 1,
      minWidth: 0,
      border: "none",
      outline: "none",
      background: "transparent",
      padding: "0 18px",
      fontFamily: "var(--font-sans)",
      fontWeight: "var(--weight-regular)",
      fontSize: "var(--body-sm)",
      color: isDark ? "var(--blush)" : "var(--brown)"
    }
  }), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    style: {
      flex: "0 0 auto",
      border: "none",
      cursor: "pointer",
      padding: "0 22px",
      background: "var(--brass)",
      color: "var(--green-deep)",
      fontFamily: "var(--font-sans)",
      fontWeight: "var(--weight-semibold)",
      fontSize: "var(--body-sm)",
      letterSpacing: "var(--track-eyebrow)"
    }
  }, buttonLabel));
}
Object.assign(__ds_scope, { EmailSignup });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/EmailSignup.jsx", error: String((e && e.message) || e) }); }

// components/navigation/NavLink.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Header / footer navigation link. Figtree, medium, in the brand's reading
 * sizes. tone "dark" for cream headers, "light" for green/navy footers.
 * `active` adds a brass underline. Footer column links use tone "light".
 */
function NavLink({
  children,
  href = "#",
  tone = "dark",
  active = false,
  style = {},
  ...rest
}) {
  const tones = {
    dark: {
      color: "var(--green-forest)",
      hover: "var(--terracotta)"
    },
    light: {
      color: "var(--text-on-dark-soft)",
      hover: "var(--blush)"
    },
    muted: {
      color: "var(--taupe)",
      hover: "var(--brown)"
    }
  };
  const t = tones[tone];
  return /*#__PURE__*/React.createElement("a", _extends({
    href: href,
    className: "at-nav-link",
    style: {
      position: "relative",
      fontFamily: "var(--font-sans)",
      fontWeight: "var(--weight-medium)",
      fontSize: "var(--body-sm)",
      letterSpacing: "0.01em",
      color: t.color,
      textDecoration: "none",
      whiteSpace: "nowrap",
      borderBottom: active ? "1px solid var(--brass)" : "1px solid transparent",
      paddingBottom: "2px",
      transition: "color .16s ease, border-color .16s ease",
      ...style
    },
    onMouseEnter: e => e.currentTarget.style.color = t.hover,
    onMouseLeave: e => e.currentTarget.style.color = t.color
  }, rest), children);
}
Object.assign(__ds_scope, { NavLink });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/NavLink.jsx", error: String((e && e.message) || e) }); }

// components/navigation/TopBar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Top announcement bar — the brand's forest-green strip with a 3px brass
 * line on top and centered blush, wide-tracked announcement text.
 * Optional `social` children render at the right.
 */
function TopBar({
  children,
  social,
  style = {},
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: "at-top-bar",
    style: {
      position: "relative",
      background: "var(--green-forest)",
      borderTop: "3px solid var(--brass)",
      minHeight: "34px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "9px 24px",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontFamily: "var(--font-sans)",
      fontWeight: "var(--weight-medium)",
      fontSize: "var(--body-xs)",
      letterSpacing: "var(--track-announce)",
      color: "var(--blush)",
      textAlign: "center"
    }
  }, children), social && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      right: "24px",
      display: "flex",
      gap: "12px",
      alignItems: "center"
    }
  }, social));
}
Object.assign(__ds_scope, { TopBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/TopBar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile/MobileChrome.jsx
try { (() => {
// MobileChrome.jsx — status bar, header (hamburger / logo / basket), slide-in nav drawer, bottom tab bar
function StatusBar() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "10px 22px 6px",
      background: "var(--green-forest)",
      color: "var(--blush)",
      fontFamily: "var(--font-sans)",
      fontWeight: 600,
      fontSize: 13,
      letterSpacing: "0.02em"
    }
  }, /*#__PURE__*/React.createElement("span", null, "9:41"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      gap: 6,
      alignItems: "center",
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("span", null, "\u25CF\u25CF\u25CF"), /*#__PURE__*/React.createElement("span", null, "Wi-Fi"), /*#__PURE__*/React.createElement("span", null, "100%")));
}
function Burger({
  open,
  onClick
}) {
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    "aria-label": "Menu",
    style: {
      width: 40,
      height: 40,
      border: "none",
      background: "transparent",
      cursor: "pointer",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      gap: 5,
      padding: 8
    }
  }, [0, 1, 2].map(i => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      height: 2,
      borderRadius: 2,
      background: "var(--green-forest)",
      transition: "transform .25s ease, opacity .2s ease",
      transform: open ? i === 0 ? "translateY(7px) rotate(45deg)" : i === 2 ? "translateY(-7px) rotate(-45deg)" : "scaleX(0)" : "none",
      opacity: open && i === 1 ? 0 : 1
    }
  })));
}
function MobileHeader({
  basket,
  onBurger,
  drawerOpen,
  onBasket
}) {
  const {
    Logo
  } = window.AbbySTableDesignSystem_c3ba5a;
  return /*#__PURE__*/React.createElement("header", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "10px 14px",
      background: "var(--cream-2)",
      borderBottom: "1px solid var(--sand)",
      position: "sticky",
      top: 0,
      zIndex: 30
    }
  }, /*#__PURE__*/React.createElement(Burger, {
    open: drawerOpen,
    onClick: onBurger
  }), /*#__PURE__*/React.createElement(Logo, {
    src: "../../assets/logo.svg",
    color: "var(--green-forest)",
    height: 26,
    withMark: false
  }), /*#__PURE__*/React.createElement("button", {
    onClick: onBasket,
    "aria-label": "Your box",
    style: {
      position: "relative",
      width: 40,
      height: 40,
      border: "none",
      background: "transparent",
      cursor: "pointer",
      fontSize: 18,
      lineHeight: 1
    }
  }, "\uD83E\uDDFA", basket > 0 && /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      top: 2,
      right: 0,
      minWidth: 16,
      height: 16,
      padding: "0 4px",
      borderRadius: 8,
      background: "var(--terracotta)",
      color: "#fff",
      fontSize: 10,
      fontWeight: 700,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "var(--font-sans)"
    }
  }, basket)));
}
function NavDrawer({
  open,
  onClose,
  onNavigate
}) {
  const {
    Logo
  } = window.AbbySTableDesignSystem_c3ba5a;
  const items = [["Menu", "dishes"], ["Gifting", "gifting"], ["Our Standards", "standards"], ["Private Table", "private"], ["Abby's Story", "founder"], ["Contact", "footer"], ["Login", "footer"]];
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: "absolute",
      inset: 0,
      background: "rgba(21,41,31,.5)",
      zIndex: 40,
      opacity: open ? 1 : 0,
      pointerEvents: open ? "auto" : "none",
      transition: "opacity .3s ease"
    }
  }), /*#__PURE__*/React.createElement("aside", {
    style: {
      position: "absolute",
      top: 0,
      left: 0,
      bottom: 0,
      width: 284,
      zIndex: 41,
      background: "var(--green-forest)",
      padding: "26px 26px",
      boxSizing: "border-box",
      transform: open ? "translateX(0)" : "translateX(-100%)",
      transition: "transform .32s cubic-bezier(.2,.8,.2,1)",
      display: "flex",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 34
    }
  }, /*#__PURE__*/React.createElement(Logo, {
    src: "../../assets/logo.svg",
    color: "var(--blush)",
    height: 26,
    withMark: false
  }), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    "aria-label": "Close",
    style: {
      border: "none",
      background: "transparent",
      color: "var(--blush)",
      fontSize: 22,
      cursor: "pointer",
      lineHeight: 1
    }
  }, "\xD7")), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: "flex",
      flexDirection: "column"
    }
  }, items.map(([label, target]) => /*#__PURE__*/React.createElement("a", {
    key: label,
    href: "#" + target,
    onClick: e => {
      e.preventDefault();
      onNavigate(target);
    },
    className: "at-drawer-link",
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 22,
      fontWeight: 500,
      color: "var(--cream-2)",
      textDecoration: "none",
      padding: "13px 0",
      borderBottom: "1px solid var(--green-mid)",
      transition: "color .16s ease, padding-left .16s ease"
    },
    onMouseEnter: e => {
      e.currentTarget.style.color = "var(--brass)";
      e.currentTarget.style.paddingLeft = "6px";
    },
    onMouseLeave: e => {
      e.currentTarget.style.color = "var(--cream-2)";
      e.currentTarget.style.paddingLeft = "0";
    }
  }, label))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "auto",
      paddingTop: 20
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontFamily: "var(--font-sans)",
      fontSize: 11,
      letterSpacing: "0.16em",
      color: "var(--green-sage)",
      textTransform: "uppercase"
    }
  }, "Cooked in Kent \xB7 Delivered UK-wide"))));
}
function TabBar({
  active,
  onTab
}) {
  const tabs = [["home", "Home", "M3 9.5 12 3l9 6.5V21H3z"], ["dishes", "Menu", "M4 4h16M4 10h16M4 16h10"], ["gifting", "Gifting", "M4 9h16v11H4zM4 9l2-4h12l2 4M12 5v15"], ["founder", "Story", "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM5 20a7 7 0 0 1 14 0"]];
  return /*#__PURE__*/React.createElement("nav", {
    style: {
      display: "flex",
      justifyContent: "space-around",
      alignItems: "center",
      padding: "8px 6px calc(8px + env(safe-area-inset-bottom))",
      background: "var(--cream-2)",
      borderTop: "1px solid var(--sand)",
      position: "sticky",
      bottom: 0,
      zIndex: 30
    }
  }, tabs.map(([id, label, d]) => {
    const on = active === id;
    return /*#__PURE__*/React.createElement("button", {
      key: id,
      onClick: () => onTab(id),
      style: {
        border: "none",
        background: "transparent",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        padding: "4px 12px",
        color: on ? "var(--terracotta)" : "var(--taupe)",
        transition: "color .16s ease"
      }
    }, /*#__PURE__*/React.createElement("svg", {
      width: "22",
      height: "22",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "1.6",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }, /*#__PURE__*/React.createElement("path", {
      d: d
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 10,
        fontWeight: on ? 600 : 500,
        letterSpacing: "0.04em"
      }
    }, label));
  }));
}
Object.assign(window, {
  StatusBar,
  MobileHeader,
  NavDrawer,
  TabBar
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile/MobileChrome.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile/MobileSections.jsx
try { (() => {
// MobileSections.jsx — the scrollable page content, mobile-tuned (single column, 390px)
function MHero({
  onMenu
}) {
  const {
    Eyebrow,
    Button
  } = window.AbbySTableDesignSystem_c3ba5a;
  return /*#__PURE__*/React.createElement("section", {
    style: {
      position: "relative",
      height: 520,
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      background: 'linear-gradient(180deg, rgba(30,58,47,.15) 0%, rgba(30,58,47,.35) 45%, rgba(30,58,47,.85) 100%), url("../../assets/hero.png") center / cover no-repeat'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      padding: "0 22px 34px"
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, {
    tone: "blush",
    style: {
      letterSpacing: "0.16em",
      fontSize: 11
    }
  }, "Chef-prepared \xB7 Chilled \xB7 UK-wide"), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: "12px 0 0",
      fontFamily: "var(--font-display)",
      fontWeight: 500,
      fontSize: 38,
      lineHeight: 1.08,
      letterSpacing: "-0.01em",
      color: "var(--white)"
    }
  }, "Nigerian food, the way it deserves to be made."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "14px 0 22px",
      fontFamily: "var(--font-sans)",
      fontSize: 14,
      lineHeight: 1.6,
      color: "var(--blush)"
    }
  }, "Flavour built from real food, not additives. Nutrition-led meals."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 14,
      alignItems: "flex-start"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    onClick: onMenu,
    style: {
      width: "100%"
    }
  }, "View the menu"), /*#__PURE__*/React.createElement("a", {
    href: "#dishes",
    onClick: e => {
      e.preventDefault();
      onMenu();
    },
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 13,
      color: "var(--blush)",
      letterSpacing: "0.04em",
      textDecoration: "none",
      borderBottom: "1px solid var(--brass)",
      paddingBottom: 3
    }
  }, "New here? Try the Taster Box"))));
}
function MStandards() {
  return /*#__PURE__*/React.createElement("section", {
    id: "standards",
    style: {
      background: "var(--cream-2)",
      textAlign: "center",
      padding: "30px 24px 34px"
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontFamily: "var(--font-sans)",
      fontWeight: 500,
      fontSize: 13,
      letterSpacing: "0.04em",
      color: "var(--brown)",
      lineHeight: 1.8
    }
  }, "No seed oils \u2B25 No bouillon or cubes", /*#__PURE__*/React.createElement("br", null), "No MSG \u2B25 No refined sugars"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "14px 0 0",
      fontFamily: "var(--font-accent)",
      fontWeight: 500,
      fontSize: 24,
      letterSpacing: "0.04em",
      color: "var(--terracotta)",
      lineHeight: 1.3
    }
  }, "Flavour built from real food and natural ingredients."));
}
const M_DISHES = [{
  image: "../../assets/dish-goat-efo.png",
  title: "Wild rice, goat efo",
  description: "Slow-cooked, deeply seasoned and made from scratch.",
  cat: "Protein-led"
}, {
  image: "../../assets/dish-fish-peppersoup.png",
  title: "Fish peppersoup\nbone broth",
  cat: "DASH"
}, {
  image: "../../assets/dish-goat-efo.png",
  title: "Warm kale & quinoa\nsalad with salmon",
  cat: "Plant-led"
}, {
  image: "../../assets/dish-fish-peppersoup.png",
  title: "Suya ribeye, jollof,\nasparagus",
  cat: "Protein-led"
}];
const M_FILTERS = ["All dishes", "Carb-conscious", "Protein-led", "DASH", "Plant-led"];
const M_MACROS = [{
  dot: "protein",
  label: "Protein 32g"
}, {
  dot: "carbs",
  label: "Carbs 18g"
}, {
  dot: "fat",
  label: "Fat 18g"
}, {
  dot: "calories",
  label: "Calories 520"
}];
function MDishes({
  onAdd
}) {
  const {
    Eyebrow,
    SectionHeading,
    FilterPill,
    DishCard
  } = window.AbbySTableDesignSystem_c3ba5a;
  const [active, setActive] = React.useState("All dishes");
  const visible = active === "All dishes" ? M_DISHES : M_DISHES.filter(d => d.cat === active);
  return /*#__PURE__*/React.createElement("section", {
    id: "dishes",
    style: {
      background: "var(--cream-3)",
      padding: "44px 0 52px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "0 22px"
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, {
    tone: "brass",
    align: "center",
    style: {
      fontSize: 12
    }
  }, "What's on the table?"), /*#__PURE__*/React.createElement(SectionHeading, {
    level: 2,
    align: "center",
    style: {
      marginTop: 8
    }
  }, "The dishes")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      overflowX: "auto",
      padding: "26px 22px 24px",
      scrollbarWidth: "none"
    }
  }, M_FILTERS.map(f => /*#__PURE__*/React.createElement("span", {
    key: f,
    style: {
      flex: "0 0 auto"
    }
  }, /*#__PURE__*/React.createElement(FilterPill, {
    active: active === f,
    onClick: () => setActive(f)
  }, f)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 18,
      overflowX: "auto",
      padding: "0 22px 6px",
      scrollSnapType: "x mandatory",
      scrollbarWidth: "none"
    }
  }, visible.map((d, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      flex: "0 0 auto",
      scrollSnapAlign: "start",
      cursor: "pointer"
    },
    onClick: () => onAdd && onAdd(d.title.replace(/\n/g, " "))
  }, /*#__PURE__*/React.createElement(DishCard, {
    image: d.image,
    title: d.title,
    description: d.description,
    nutrition: M_MACROS,
    width: 262
  })))));
}
function MFounder() {
  const {
    Eyebrow,
    SectionHeading
  } = window.AbbySTableDesignSystem_c3ba5a;
  return /*#__PURE__*/React.createElement("section", {
    id: "founder",
    style: {
      background: "var(--blush)",
      padding: "44px 22px 50px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 360,
      borderRadius: "var(--radius-lg)",
      background: 'url("../../assets/founder.png") center / cover no-repeat',
      marginBottom: 26
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, {
    tone: "brass",
    align: "center",
    style: {
      fontSize: 12
    }
  }, "Meet the founder"), /*#__PURE__*/React.createElement(SectionHeading, {
    level: 2,
    align: "center",
    style: {
      marginTop: 10
    }
  }, "Esther Abby Josiah"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 18,
      fontFamily: "var(--font-sans)",
      fontSize: 14,
      lineHeight: 1.7,
      color: "var(--brown)"
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 14px"
    }
  }, "After more than a decade cooking Nigerian food for some of Britain's finest tables, one devastating diagnosis changed everything."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0
    }
  }, "Remission became a reason to rethink everything she knew about the food she loved. That journey gave birth to Abby's Table.")), /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => e.preventDefault(),
    style: {
      display: "inline-block",
      marginTop: 20,
      fontFamily: "var(--font-sans)",
      fontWeight: 600,
      fontSize: 13,
      letterSpacing: "0.04em",
      color: "var(--terracotta)",
      textDecoration: "none"
    }
  }, "Read Abby's story \u2192")));
}
function MPromo({
  onChoose
}) {
  const {
    SectionHeading,
    Button
  } = window.AbbySTableDesignSystem_c3ba5a;
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "var(--green-forest)",
      textAlign: "center",
      padding: "46px 24px"
    }
  }, /*#__PURE__*/React.createElement(SectionHeading, {
    level: 2,
    tone: "cream",
    align: "center"
  }, "Eight chef-prepared dishes. \xA3150"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "12px 0 24px",
      fontFamily: "var(--font-sans)",
      fontSize: 14,
      color: "var(--sand-2)",
      lineHeight: 1.6
    }
  }, "Quality ingredients, traditional flavour and nothing unnecessary."), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    onClick: onChoose,
    style: {
      width: "100%"
    }
  }, "Choose your meals"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "16px 0 0",
      fontFamily: "var(--font-sans)",
      fontSize: 12,
      color: "var(--cream-2)"
    }
  }, "New here? Try the Taster Box \u2014 four dishes, \xA378"));
}
function MGifting() {
  const {
    Eyebrow,
    SectionHeading,
    Button
  } = window.AbbySTableDesignSystem_c3ba5a;
  return /*#__PURE__*/React.createElement("section", {
    id: "gifting",
    style: {
      background: "var(--cream)",
      padding: "46px 22px 52px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 300,
      borderRadius: "var(--radius-lg)",
      background: 'url("../../assets/dish-fish-peppersoup.png") center / cover no-repeat',
      marginBottom: 24
    }
  }), /*#__PURE__*/React.createElement(Eyebrow, {
    tone: "brass",
    style: {
      fontSize: 12
    }
  }, "A thoughtful gift"), /*#__PURE__*/React.createElement(SectionHeading, {
    level: 2,
    style: {
      marginTop: 10
    }
  }, "Send a box that says everything."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "14px 0 24px",
      fontFamily: "var(--font-sans)",
      fontSize: 14,
      lineHeight: 1.7,
      color: "var(--brown)"
    }
  }, "A box that arrives beautifully, keeps in the fridge or freezer, and tastes like someone cooked for them, because someone did."), /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    style: {
      width: "100%"
    }
  }, "Build a gift box"));
}
function MPrivate() {
  const {
    Eyebrow,
    SectionHeading,
    Button
  } = window.AbbySTableDesignSystem_c3ba5a;
  return /*#__PURE__*/React.createElement("section", {
    id: "private",
    style: {
      background: "var(--navy)",
      textAlign: "center",
      padding: "48px 24px"
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, {
    tone: "brass",
    align: "center",
    style: {
      fontSize: 12
    }
  }, "A private service"), /*#__PURE__*/React.createElement(SectionHeading, {
    level: 2,
    tone: "cream",
    align: "center",
    style: {
      marginTop: 10
    }
  }, "Abby's Private Table"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "16px 0 26px",
      fontFamily: "var(--font-sans)",
      fontSize: 14,
      lineHeight: 1.7,
      color: "var(--sand-2)"
    }
  }, "Bespoke Nigerian-inspired recipe collections, developed with a registered dietitian and returned to your clinical team for sign-off. Available worldwide."), /*#__PURE__*/React.createElement(Button, {
    variant: "outline-brass",
    style: {
      width: "100%"
    }
  }, "Request a private consultation"));
}
function MFooter({
  onSubscribe
}) {
  const {
    Logo,
    NavLink,
    EmailSignup,
    Eyebrow
  } = window.AbbySTableDesignSystem_c3ba5a;
  const cols = [["Shop", ["Menu", "Gifting", "Discovery Box", "Private Table"]], ["Learn", ["Abby's Story", "Our Standards", "Journal"]], ["Information", ["Delivery & FAQs", "Contact Us", "Allergens"]]];
  return /*#__PURE__*/React.createElement("footer", {
    id: "footer",
    style: {
      background: "var(--green-deep)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 2,
      background: "var(--brass)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "40px 22px 30px"
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, {
    tone: "brass",
    as: "p",
    style: {
      fontSize: 11,
      marginBottom: 12
    }
  }, "Join the table"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 16px",
      fontFamily: "var(--font-sans)",
      fontSize: 13,
      lineHeight: 1.6,
      color: "var(--sand-2)"
    }
  }, "Kitchen notes and offers from Abby monthly."), /*#__PURE__*/React.createElement(EmailSignup, {
    tone: "dark",
    width: "100%",
    onSubmit: onSubscribe
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "30px 20px",
      marginTop: 36
    }
  }, cols.map(([head, links]) => /*#__PURE__*/React.createElement("div", {
    key: head
  }, /*#__PURE__*/React.createElement(Eyebrow, {
    tone: "brass",
    as: "p",
    style: {
      fontSize: 11,
      marginBottom: 14
    }
  }, head), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, links.map(l => /*#__PURE__*/React.createElement(NavLink, {
    key: l,
    tone: "light",
    onClick: e => e.preventDefault()
  }, l)))))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 1,
      background: "var(--green-mid)",
      margin: "32px 0 22px"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement(Logo, {
    src: "../../assets/logo.svg",
    color: "var(--blush)",
    height: 22,
    withMark: false
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontStyle: "italic",
      fontSize: 16,
      color: "var(--terracotta)"
    }
  }, "Abby x")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 18,
      fontFamily: "var(--font-sans)",
      fontSize: 11,
      color: "var(--green-sage)"
    }
  }, "\xA9 2026 Abby's Table")));
}
Object.assign(window, {
  MHero,
  MStandards,
  MDishes,
  MFounder,
  MPromo,
  MGifting,
  MPrivate,
  MFooter
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile/MobileSections.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Dishes.jsx
try { (() => {
// Dishes.jsx — the menu section: eyebrow, title, carousel arrows, filters, card row
const DISHES = [{
  image: "../../assets/dish-goat-efo.png",
  title: "Wild rice, goat efo",
  description: "Slow-cooked, deeply seasoned and made from scratch.",
  cat: "Protein-led"
}, {
  image: "../../assets/dish-fish-peppersoup.png",
  title: "Fish peppersoup\nbone broth",
  cat: "DASH"
}, {
  image: "../../assets/dish-goat-efo.png",
  title: "Warm kale & quinoa\nsalad with salmon",
  cat: "Plant-led"
}, {
  image: "../../assets/dish-fish-peppersoup.png",
  title: "Suya ribeye, jollof,\nasparagus",
  cat: "Protein-led"
}, {
  image: "../../assets/dish-goat-efo.png",
  title: "Egusi & spinach,\nwild rice",
  cat: "Everyday balance"
}];
const FILTERS = ["All dishes", "Carb-conscious", "Protein-led", "Mediterranean-inspired", "DASH", "Plant-led", "Everyday balance"];
const MACROS = [{
  dot: "protein",
  label: "Protein 32g"
}, {
  dot: "carbs",
  label: "Carbs 18g"
}, {
  dot: "fat",
  label: "Fat 18g"
}, {
  dot: "calories",
  label: "Calories 520"
}];
function Dishes({
  onAdd
}) {
  const {
    Eyebrow,
    SectionHeading,
    FilterPill,
    IconButton,
    DishCard
  } = window.AbbySTableDesignSystem_c3ba5a;
  const [active, setActive] = React.useState("All dishes");
  const scroller = React.useRef(null);
  const visible = active === "All dishes" ? DISHES : DISHES.filter(d => d.cat === active);
  const scroll = dir => scroller.current && scroller.current.scrollBy({
    left: dir * 332,
    behavior: "smooth"
  });
  return /*#__PURE__*/React.createElement("section", {
    id: "dishes",
    style: {
      background: "var(--cream-3)",
      padding: "72px 0 88px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      maxWidth: 1280,
      margin: "0 auto",
      padding: "0 48px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, {
    tone: "brass",
    align: "center"
  }, "What's on the table?"), /*#__PURE__*/React.createElement(SectionHeading, {
    level: 1,
    align: "center",
    style: {
      marginTop: 10
    }
  }, "The dishes")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: 6,
      right: 48,
      display: "flex",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    tone: "light",
    arrow: "left",
    label: "Previous",
    onClick: () => scroll(-1)
  }), /*#__PURE__*/React.createElement(IconButton, {
    tone: "dark",
    arrow: "right",
    label: "Next",
    onClick: () => scroll(1)
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: 12,
      margin: "40px 0 44px"
    }
  }, FILTERS.map(f => /*#__PURE__*/React.createElement(FilterPill, {
    key: f,
    active: active === f,
    onClick: () => setActive(f)
  }, f))), /*#__PURE__*/React.createElement("div", {
    ref: scroller,
    style: {
      display: "flex",
      gap: 32,
      overflowX: "auto",
      paddingBottom: 8,
      scrollbarWidth: "none"
    }
  }, visible.map((d, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      flex: "0 0 auto",
      cursor: "pointer"
    },
    onClick: () => onAdd && onAdd(d.title.replace(/\n/g, " "))
  }, /*#__PURE__*/React.createElement(DishCard, {
    image: d.image,
    title: d.title,
    description: d.description,
    nutrition: MACROS
  }))))));
}
Object.assign(window, {
  Dishes
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Dishes.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Footer.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// Footer.jsx — newsletter, link columns, sub-footer with socials
function Footer() {
  const {
    Logo,
    NavLink,
    EmailSignup,
    Eyebrow
  } = window.AbbySTableDesignSystem_c3ba5a;
  const cols = [{
    head: "Shop",
    links: ["Menu", "Gifting", "Discovery Box", "Private Table"]
  }, {
    head: "Learn",
    links: ["Abby's Story", "Our Standards", "Journal"]
  }, {
    head: "Information",
    links: ["Delivery & FAQs", "Contact Us", "Allergens"]
  }];
  const Col = ({
    head,
    links
  }) => /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Eyebrow, {
    tone: "brass",
    as: "p",
    style: {
      fontSize: 11,
      marginBottom: 16
    }
  }, head), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, links.map(l => /*#__PURE__*/React.createElement(NavLink, {
    key: l,
    tone: "light"
  }, l))));
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      background: "var(--green-deep)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 2,
      background: "var(--brass)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1280,
      margin: "0 auto",
      padding: "56px 48px 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1.4fr 1fr 1fr 1fr",
      gap: 48
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Eyebrow, {
    tone: "brass",
    as: "p",
    style: {
      fontSize: 11,
      marginBottom: 16
    }
  }, "Join the table"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 18px",
      maxWidth: 280,
      fontFamily: "var(--font-sans)",
      fontSize: 13,
      lineHeight: 1.6,
      color: "var(--sand-2)"
    }
  }, "Kitchen notes and offers from Abby monthly."), /*#__PURE__*/React.createElement(EmailSignup, {
    tone: "dark"
  })), cols.map(c => /*#__PURE__*/React.createElement(Col, _extends({
    key: c.head
  }, c)))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 1,
      background: "var(--green-mid)",
      margin: "44px 0 24px"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      paddingBottom: 28
    }
  }, /*#__PURE__*/React.createElement(Logo, {
    src: "../../assets/logo.svg",
    color: "var(--blush)",
    height: 28,
    withMark: false
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontStyle: "italic",
      fontSize: 18,
      color: "var(--terracotta)"
    }
  }, "Abby x"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, {
    tone: "muted",
    as: "span",
    style: {
      fontSize: 11,
      color: "var(--green-sage)"
    }
  }, "Follow the table"), /*#__PURE__*/React.createElement(SocialIcons, {
    tone: "dark"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 12,
      color: "var(--green-sage)",
      paddingBottom: 28
    }
  }, "\xA9 2026 Abby's Table")));
}
Object.assign(window, {
  Footer
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Footer.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Header.jsx
try { (() => {
// Header.jsx — top announcement bar + sticky header (logo, nav, order CTA)
function SocialIcons({
  tone
}) {
  const c = tone === "dark" ? "var(--blush)" : "var(--green-forest)";
  const I = ({
    d,
    vb = "0 0 16 16"
  }) => /*#__PURE__*/React.createElement("svg", {
    width: "15",
    height: "15",
    viewBox: vb,
    fill: c,
    style: {
      display: "block"
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: d
  }));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 12,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement(I, {
    d: "M8 4.2A3.8 3.8 0 1 0 8 11.8 3.8 3.8 0 0 0 8 4.2Zm0 6.27A2.47 2.47 0 1 1 8 5.53a2.47 2.47 0 0 1 0 4.94Zm4.84-6.42a.89.89 0 1 1-.9-.89.89.89 0 0 1 .9.89ZM15.36 5.3a4.39 4.39 0 0 0-1.2-3.1A4.42 4.42 0 0 0 11.06 1c-1.22-.07-4.88-.07-6.1 0A4.41 4.41 0 0 0 1.85 2.2 4.4 4.4 0 0 0 .64 5.3c-.07 1.22-.07 4.88 0 6.1a4.39 4.39 0 0 0 1.2 3.1 4.43 4.43 0 0 0 3.11 1.2c1.22.07 4.88.07 6.1 0a4.39 4.39 0 0 0 3.1-1.2 4.42 4.42 0 0 0 1.2-3.1c.08-1.22.08-4.87 0-6.1Z"
  }), /*#__PURE__*/React.createElement(I, {
    d: "M6.95 0v6.9A2.66 2.66 0 1 1 4.3 4.85c.35 0 .7.07 1 .21V3.15a4.5 4.5 0 0 0-1-.1A4.2 4.2 0 1 0 8.75 6.9V3.3a4.55 4.55 0 0 0 2.75 1.1V2.55A2.73 2.73 0 0 1 8.75 0Z",
    vb: "0 0 11.5 11.4"
  }), /*#__PURE__*/React.createElement(I, {
    d: "M4.05 11.15V6h1.7l.3-1.95h-2V2.8c0-.55.25-.95 1-.95h1.1V.1A14.6 14.6 0 0 0 4.55 0C2.85 0 1.75 1.05 1.75 2.6v1.45H0V6h1.75v5.15Z",
    vb: "0 0 6.15 11.15"
  }));
}
function Header({
  onOrder
}) {
  const {
    TopBar,
    Logo,
    NavLink,
    Button
  } = window.AbbySTableDesignSystem_c3ba5a;
  const nav = ["Menu", "Gifting", "Our Standards", "Private Table", "Abby's Story", "Contact", "Login"];
  return /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement(TopBar, {
    social: /*#__PURE__*/React.createElement(SocialIcons, {
      tone: "dark"
    })
  }, "Cooked in small batches in our Kent kitchen. Delivered chilled, UK-wide."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "20px 48px",
      background: "var(--cream-2)"
    }
  }, /*#__PURE__*/React.createElement(Logo, {
    src: "../../assets/logo.svg",
    color: "var(--green-forest)",
    height: 38
  }), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: "flex",
      gap: 26,
      alignItems: "center"
    }
  }, nav.map((n, i) => /*#__PURE__*/React.createElement(NavLink, {
    key: n,
    active: i === 0
  }, n))), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "sm",
    onClick: onOrder
  }, "Order")));
}
Object.assign(window, {
  Header,
  SocialIcons
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Header.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Hero.jsx
try { (() => {
// Hero.jsx — full-bleed hero + the "no seed oils" standards band
function Hero({
  onMenu
}) {
  const {
    Eyebrow,
    Button
  } = window.AbbySTableDesignSystem_c3ba5a;
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("section", {
    style: {
      position: "relative",
      height: 590,
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      background: 'linear-gradient(90deg, rgba(30,58,47,.55) 0%, rgba(30,58,47,.15) 45%, rgba(30,58,47,0) 70%), url("../../assets/hero.png") center / cover no-repeat'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      maxWidth: 560,
      padding: "120px 0 0 48px"
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, {
    tone: "blush",
    style: {
      letterSpacing: "0.16em"
    }
  }, "Chef-prepared \xB7 Chilled \xB7 UK-wide delivery"), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: "20px 0 0",
      fontFamily: "var(--font-display)",
      fontWeight: 500,
      fontSize: 55,
      lineHeight: 1.08,
      letterSpacing: "-0.01em",
      color: "var(--white)"
    }
  }, "Nigerian food, the way it deserves to be made."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "20px 0 32px",
      maxWidth: 380,
      fontFamily: "var(--font-sans)",
      fontSize: 15,
      lineHeight: 1.6,
      color: "var(--blush)"
    }
  }, "High quality ingredients. Flavour built from real food, not additives. Nutrition-led meals."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 22
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    onClick: onMenu
  }, "View the menu"), /*#__PURE__*/React.createElement("a", {
    href: "#dishes",
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 13,
      color: "var(--blush)",
      letterSpacing: "0.04em",
      textDecoration: "none",
      borderBottom: "1px solid var(--brass)",
      paddingBottom: 3
    }
  }, "New here? Try the Taster Box")))), /*#__PURE__*/React.createElement("section", {
    style: {
      background: "var(--cream-2)",
      textAlign: "center",
      padding: "38px 24px 44px"
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontFamily: "var(--font-sans)",
      fontWeight: 500,
      fontSize: 15,
      letterSpacing: "0.06em",
      color: "var(--brown)"
    }
  }, "No seed oils \u2B25 No bouillon or cubes \u2B25 No MSG \u2B25 No refined sugars"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "16px 0 0",
      fontFamily: "var(--font-accent)",
      fontWeight: 500,
      fontSize: 28,
      letterSpacing: "0.06em",
      color: "var(--terracotta)"
    }
  }, "Flavour built from real food and natural ingredients.")));
}
Object.assign(window, {
  Hero
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Hero.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Story.jsx
try { (() => {
// Story.jsx — founder band, promo strip, gifting + private table sections
function Founder() {
  const {
    Eyebrow,
    SectionHeading
  } = window.AbbySTableDesignSystem_c3ba5a;
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "var(--blush)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1280,
      margin: "0 auto",
      display: "grid",
      gridTemplateColumns: "560px 1fr",
      gap: 80,
      padding: "72px 48px",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 576,
      borderRadius: "var(--radius-lg)",
      background: 'url("../../assets/founder.png") center / cover no-repeat'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      maxWidth: 420,
      margin: "0 auto"
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, {
    tone: "brass",
    align: "center"
  }, "Meet the founder"), /*#__PURE__*/React.createElement(SectionHeading, {
    level: 1,
    align: "center",
    style: {
      marginTop: 12
    }
  }, "Esther Abby Josiah"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 22,
      fontFamily: "var(--font-sans)",
      fontSize: 14,
      lineHeight: 1.7,
      color: "var(--brown)"
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 16px"
    }
  }, "After more than a decade cooking Nigerian food for some of Britain's finest tables through Mrs J Foods and B\xE9ll\xE9-Full, one devastating diagnosis changed everything."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 16px"
    }
  }, "Remission became more than recovery. It became a reason to rethink and relearn everything she knew about the food she loved."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0
    }
  }, "That journey gave birth to Abby's Table.")), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      display: "inline-block",
      marginTop: 22,
      fontFamily: "var(--font-sans)",
      fontWeight: 600,
      fontSize: 13,
      letterSpacing: "0.04em",
      color: "var(--terracotta)",
      textDecoration: "none"
    }
  }, "Read Abby's story \u2192"))));
}
function Promo({
  onChoose
}) {
  const {
    SectionHeading,
    Button
  } = window.AbbySTableDesignSystem_c3ba5a;
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "var(--green-forest)",
      textAlign: "center",
      padding: "64px 24px"
    }
  }, /*#__PURE__*/React.createElement(SectionHeading, {
    level: 2,
    tone: "cream",
    align: "center"
  }, "Eight chef-prepared dishes. \xA3150"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "14px 0 28px",
      fontFamily: "var(--font-sans)",
      fontSize: 15,
      color: "var(--sand-2)"
    }
  }, "Quality ingredients, traditional flavour and nothing unnecessary."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      gap: 24,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    onClick: onChoose
  }, "Choose your meals"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 13,
      color: "var(--cream-2)"
    }
  }, "New here? Try the Taster Box \u2014 four dishes, \xA378")));
}
function Gifting() {
  const {
    Eyebrow,
    SectionHeading,
    Button
  } = window.AbbySTableDesignSystem_c3ba5a;
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "var(--cream)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1280,
      margin: "0 auto",
      display: "grid",
      gridTemplateColumns: "1fr 520px",
      gap: 80,
      padding: "84px 48px",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Eyebrow, {
    tone: "brass"
  }, "A thoughtful gift"), /*#__PURE__*/React.createElement(SectionHeading, {
    level: 1,
    style: {
      marginTop: 12
    }
  }, "Send a box that says everything."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "18px 0 28px",
      maxWidth: 380,
      fontFamily: "var(--font-sans)",
      fontSize: 14,
      lineHeight: 1.7,
      color: "var(--brown)"
    }
  }, "New parents. A season of recovery. A busy stretch. Just because. A box that arrives beautifully, keeps in the fridge or freezer, and tastes like someone cooked for them, because someone did."), /*#__PURE__*/React.createElement(Button, {
    variant: "outline"
  }, "Build a gift box")), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 460,
      borderRadius: "var(--radius-lg)",
      background: 'url("../../assets/dish-fish-peppersoup.png") center / cover no-repeat'
    }
  })));
}
function PrivateTable() {
  const {
    Eyebrow,
    SectionHeading,
    Button
  } = window.AbbySTableDesignSystem_c3ba5a;
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "var(--navy)",
      textAlign: "center",
      padding: "72px 24px"
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, {
    tone: "brass",
    align: "center"
  }, "A private service"), /*#__PURE__*/React.createElement(SectionHeading, {
    level: 1,
    tone: "cream",
    align: "center",
    style: {
      marginTop: 12
    }
  }, "Abby's Private Table"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "18px auto 30px",
      maxWidth: 560,
      fontFamily: "var(--font-sans)",
      fontSize: 15,
      lineHeight: 1.7,
      color: "var(--sand-2)"
    }
  }, "Bespoke Nigerian-inspired recipe collections, developed with a registered dietitian to the guidelines your clinical team has set, and returned to them for sign-off. Available worldwide."), /*#__PURE__*/React.createElement(Button, {
    variant: "outline-brass"
  }, "Request a private consultation"));
}
Object.assign(window, {
  Founder,
  Promo,
  Gifting,
  PrivateTable
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Story.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Logo = __ds_scope.Logo;

__ds_ns.DishCard = __ds_scope.DishCard;

__ds_ns.Eyebrow = __ds_scope.Eyebrow;

__ds_ns.NutritionTag = __ds_scope.NutritionTag;

__ds_ns.SectionHeading = __ds_scope.SectionHeading;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.FilterPill = __ds_scope.FilterPill;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.EmailSignup = __ds_scope.EmailSignup;

__ds_ns.NavLink = __ds_scope.NavLink;

__ds_ns.TopBar = __ds_scope.TopBar;

})();
