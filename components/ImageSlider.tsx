'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from 'cn'

const SLIDES = [
  { src: '/images/slider/1.webp', alt: 'Слайд 1' },
  { src: '/images/slider/2.webp', alt: 'Слайд 2' },
  { src: '/images/slider/3.webp', alt: 'Слайд 3' },
  { src: '/images/slider/4.webp', alt: 'Слайд 4' },
]

const AUTO_DELAY = 3000

export function ImageSlider() {
  const [index, setIndex] = useState(0)

  const next = useCallback(() => {
    setIndex((current) => (current + 1) % SLIDES.length)
  }, [])

  const prev = useCallback(() => {
    setIndex((current) => (current - 1 + SLIDES.length) % SLIDES.length)
  }, [])

  useEffect(() => {
    const id = setInterval(next, AUTO_DELAY)
    return () => clearInterval(id)
  }, [next, index])

  return (
    <div className="relative h-full w-full overflow-hidden bg-muted">
      {SLIDES.map((slide, i) => (
        <Image
          key={slide.src}
          src={slide.src}
          alt={slide.alt}
          fill
          priority={i === 0}
          sizes="(min-width: 1024px) 50vw, 100vw"
          className={cn(
            'object-cover transition-opacity duration-700 ease-in-out dark:brightness-[0.6]',
            i === index ? 'opacity-100' : 'opacity-0',
          )}
        />
      ))}

      <button
        type="button"
        onClick={prev}
        aria-label="Предыдущий слайд"
        className="absolute top-1/2 left-4 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/70 text-foreground backdrop-blur transition hover:bg-background"
      >
        <ChevronLeft className="size-5" />
      </button>
      <button
        type="button"
        onClick={next}
        aria-label="Следующий слайд"
        className="absolute top-1/2 right-4 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/70 text-foreground backdrop-blur transition hover:bg-background"
      >
        <ChevronRight className="size-5" />
      </button>

      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
        {SLIDES.map((slide, i) => (
          <button
            key={slide.src}
            type="button"
            aria-label={`Перейти к слайду ${i + 1}`}
            onClick={() => setIndex(i)}
            className={cn(
              'size-2 rounded-full transition',
              i === index ? 'bg-background' : 'bg-background/40',
            )}
          />
        ))}
      </div>
    </div>
  )
}
