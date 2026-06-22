import { useEffect, useState } from "react";
import { getSignedFileUrl } from "@/lib/storage";

interface SignedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  bucket: string;
  source: string | null | undefined;
  fallback?: React.ReactNode;
}

export function SignedImage({ bucket, source, fallback = null, ...imgProps }: SignedImageProps) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!source) {
      setUrl(null);
      return;
    }
    getSignedFileUrl(bucket, source).then((u) => {
      if (!cancelled) setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [bucket, source]);

  if (!url) return <>{fallback}</>;
  // eslint-disable-next-line jsx-a11y/alt-text
  return <img src={url} {...imgProps} />;
}