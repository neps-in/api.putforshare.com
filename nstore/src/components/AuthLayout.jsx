"use client";

import { useEffect, useMemo, useState } from "react";

const loginMockup = "/assets/pfs-login.png";
const signupMockup = "/assets/pfs-signup.png";
const forgotPasswordMockup = "/assets/pfs-forgot-pass.png";

function AuthCarousel({ variant }) {
  const slides = useMemo(() => {
    const commonSlides = [
      {
        key: "login",
        image: loginMockup,
        alt: "Login page mockup",
        title: "One account, one library",
        subtitle: "Track books, tags, and orders from one place."
      },
      {
        key: "signup",
        image: signupMockup,
        alt: "Signup page mockup",
        title: "Create your reading shelf",
        subtitle: "Start buying and selling pre-loved books in minutes."
      },
      {
        key: "forgot",
        image: forgotPasswordMockup,
        alt: "Forgot password page mockup",
        title: "Quick account recovery",
        subtitle: "Reset and get back to your cart without delay."
      }
    ];

    if (variant === "signup") {
      return [commonSlides[1], commonSlides[0], commonSlides[2]];
    }
    if (variant === "forgot" || variant === "reset") {
      return [commonSlides[2], commonSlides[0], commonSlides[1]];
    }
    return commonSlides;
  }, [variant]);

  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  useEffect(() => {
    setActiveSlideIndex(0);
  }, [variant]);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlideIndex((index) => (index + 1) % slides.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <aside className="relative overflow-hidden bg-slate-900" aria-label="Store highlights">
      <div
        className="flex h-full transition-transform duration-300"
        style={{ transform: `translateX(-${activeSlideIndex * 100}%)` }}
      >
        {slides.map((slide) => (
          <article className="relative min-w-full" key={slide.key}>
            <img src={slide.image} alt={slide.alt} className="h-full w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent p-6 text-white">
              <h2 className="text-xl font-semibold">{slide.title}</h2>
              <p className="mt-2 text-sm text-white/80">{slide.subtitle}</p>
            </div>
          </article>
        ))}
      </div>
      <div className="absolute bottom-4 left-6 flex items-center gap-2">
        {slides.map((slide, index) => (
          <button
            key={slide.key}
            type="button"
            className={`h-2 rounded-full transition-all ${index === activeSlideIndex ? "w-6 bg-orange-400" : "w-2 bg-white/50"}`}
            aria-label={`Go to slide ${index + 1}`}
            onClick={() => setActiveSlideIndex(index)}
          />
        ))}
      </div>
    </aside>
  );
}

export default function AuthLayout({ title, subtitle, children, carouselVariant }) {
  if (!carouselVariant) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center px-4 py-10">
        <section className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
          <div className="mt-4">{children}</div>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-10">
      <section className="grid w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg lg:grid-cols-2">
        <section className="flex flex-col justify-center p-6 lg:p-10">
          <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
          <div className="mt-4">{children}</div>
        </section>
        <AuthCarousel variant={carouselVariant} />
      </section>
    </main>
  );
}
