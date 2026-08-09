import React, { useRef, useState } from "react";
import { Camera, Image as ImageIcon, Trash2, RefreshCw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  className?: string;
  bucket?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  value,
  onChange,
  label = "Upload Image",
  className = "",
  bucket = "society_uploads",
}) => {
  const [uploading, setUploading] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selected file is not an image.");
      return;
    }

    // Limit to 5MB
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB.");
      return;
    }

    setUploading(true);

    try {
      // 1. Try uploading to Supabase Storage
      const fileExt = file.name.split(".").pop();
      const filePath = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;

      const { data, error } = await supabase.storage.from(bucket).upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      });

      if (!error && data?.path) {
        const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
        if (publicUrlData?.publicUrl) {
          onChange(publicUrlData.publicUrl);
          toast.success("Image uploaded successfully.");
          setUploading(false);
          return;
        }
      }

      // 2. Fallback: Convert to Base64 Data URL if bucket not configured
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Url = reader.result as string;
        onChange(base64Url);
        toast.success("Image loaded successfully.");
        setUploading(false);
      };
      reader.onerror = () => {
        toast.error("Failed to read image file.");
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.warn("Storage upload failed, falling back to base64 encoding", err);
      const reader = new FileReader();
      reader.onloadend = () => {
        onChange(reader.result as string);
        toast.success("Image loaded successfully.");
        setUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemove = () => {
    onChange(null);
    if (galleryInputRef.current) galleryInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    toast.info("Image removed.");
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && <label className="text-sm font-medium text-foreground">{label}</label>}

      {value ? (
        <div className="relative rounded-lg overflow-hidden border border-border bg-muted/30 group max-w-xs">
          <img src={value} alt="Preview" className="w-full h-40 object-cover rounded-lg" />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => galleryInputRef.current?.click()}
              disabled={uploading}
            >
              <RefreshCw className="h-4 w-4 mr-1" /> Replace
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleRemove}
              disabled={uploading}
            >
              <Trash2 className="h-4 w-4 mr-1" /> Delete
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => galleryInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <ImageIcon className="h-4 w-4 mr-2" />
            )}
            Gallery
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => cameraInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Camera className="h-4 w-4 mr-2" />
            )}
            Camera
          </Button>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
};
