import { useEffect, useRef, type PointerEvent } from "react";

type Props = {
  uid: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export function SignaturePad({ uid, value, onChange, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const skip = useRef(false);

  useEffect(() => {
    if (skip.current) {
      skip.current = false;
      return;
    }
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!value) return;
    const image = new Image();
    image.onload = () => ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    image.src = value;
  }, [uid, value]);

  function point(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = ref.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function commit() {
    const canvas = ref.current;
    if (!canvas) return;
    skip.current = true;
    onChange(canvas.toDataURL("image/png"));
  }

  return (
    <canvas
      ref={ref}
      width={640}
      height={200}
      className={className}
      aria-label="التوقيع"
      onPointerDown={(event) => {
        const canvas = ref.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;
        drawing.current = true;
        canvas.setPointerCapture(event.pointerId);
        const p = point(event);
        ctx.strokeStyle = "#163a86";
        ctx.lineWidth = 3.4;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
      }}
      onPointerMove={(event) => {
        if (!drawing.current) return;
        const ctx = ref.current?.getContext("2d");
        if (!ctx) return;
        const p = point(event);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }}
      onPointerUp={() => {
        if (!drawing.current) return;
        drawing.current = false;
        commit();
      }}
      onPointerCancel={() => {
        drawing.current = false;
      }}
    />
  );
}
