import { useMemo, useRef, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { MediaImage, PLACEHOLDER_IMAGE, type PublicMedia } from "@/lib/media";
import { toast } from "sonner";
import {
  Check,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  FileImage,
  GripVertical,
  ImagePlus,
  LayoutDashboard,
  RefreshCw,
  ShieldCheck,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";

type Section = { key: "hero" | "property-gallery" | "unit" | "amenities" | "location"; unitKey?: string; label: string; eyebrow: string; description: string };

const sections: Section[] = [
  { key: "hero", label: "Website hero", eyebrow: "01", description: "The first impression above the fold." },
  { key: "property-gallery", label: "Property gallery", eyebrow: "02", description: "Shared spaces, details, and the overall atmosphere." },
  { key: "unit", unitKey: "residence-i", label: "Unit 01", eyebrow: "03", description: "Residence I photography and room views." },
  { key: "unit", unitKey: "residence-ii", label: "Unit 02", eyebrow: "04", description: "Residence II photography and room views." },
  { key: "unit", unitKey: "residence-iii", label: "Unit 03", eyebrow: "05", description: "Residence III photography and room views." },
  { key: "unit", unitKey: "residence-iv", label: "Unit 04", eyebrow: "06", description: "Residence IV photography and room views." },
  { key: "amenities", label: "Amenities", eyebrow: "07", description: "Comfort, convenience, and essentials." },
  { key: "location", label: "Location", eyebrow: "08", description: "Arrival, surroundings, and local context." },
] as Section[];

const unitPhotoTypes = [
  ["gallery", "Gallery photos"],
  ["bedroom", "Bedroom photos"],
  ["bathroom", "Bathroom photos"],
  ["living", "Living area photos"],
  ["other", "Other photos"],
] as const;

type PhotoType = "cover" | "gallery" | "bedroom" | "bathroom" | "living" | "other";
type UploadTarget = { sectionKey: Section["key"]; unitKey?: string; photoType: PhotoType; replaceId?: number };

type UploadPreview = { id: string; name: string; url: string; progress: "uploading" | "done" | "error" };

function readFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Unable to read this image."));
    reader.readAsDataURL(file);
  });
}

function MediaAdminShell() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState("Website hero");
  const [activeUnitType, setActiveUnitType] = useState<PhotoType>("gallery");
  const [uploadTarget, setUploadTarget] = useState<UploadTarget | null>(null);
  const [uploadPreviews, setUploadPreviews] = useState<UploadPreview[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();
  const mediaQuery = trpc.media.adminList.useQuery(undefined, { enabled: user?.role === "admin" });
  const upload = trpc.media.upload.useMutation();
  const setCover = trpc.media.setCover.useMutation();
  const reorder = trpc.media.reorder.useMutation();
  const remove = trpc.media.remove.useMutation();
  const [draggedId, setDraggedId] = useState<number | null>(null);

  const media = mediaQuery.data ?? [];
  const currentSection = sections.find((item) => item.label === activeSection) ?? sections[0];
  const sectionMedia = useMemo(() => {
    return media.filter((item) => item.sectionKey === currentSection.key && (currentSection.key !== "unit" || item.unitKey === currentSection.unitKey) && (currentSection.key !== "unit" || item.photoType === activeUnitType));
  }, [activeSection, activeUnitType, media, currentSection]);
  const selectSection = (section: Section) => {
    setActiveSection(section.label);
    if (section.key === "unit") setActiveUnitType("gallery");
  };

  const refresh = () => utils.media.adminList.invalidate();

  const openPicker = (target: UploadTarget) => {
    setUploadTarget(target);
    if (fileInput.current) {
      fileInput.current.value = "";
      fileInput.current.click();
    }
  };

  const onFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length || !uploadTarget) return;
    const allowed = files.filter((file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type));
    if (allowed.length !== files.length) toast.error("Only JPG, JPEG, PNG, and WEBP images are supported.");
    if (!allowed.length) return;
    const previews = allowed.map((file) => ({ id: `${file.name}-${file.lastModified}`, name: file.name, url: URL.createObjectURL(file), progress: "uploading" as const }));
    setUploadPreviews(previews);
    try {
      for (let index = 0; index < allowed.length; index += 1) {
        const file = allowed[index];
        await upload.mutateAsync({
          ...uploadTarget,
          unitKey: uploadTarget.unitKey ?? null,
          imageAlt: `${currentSection.label} — ${file.name.replace(/\.[^/.]+$/, "")}`,
          fileName: file.name,
          mimeType: file.type,
          fileSize: file.size,
          base64: await readFile(file),
        });
        setUploadPreviews((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, progress: "done" } : item));
      }
      toast.success(`${allowed.length} ${allowed.length === 1 ? "photo" : "photos"} saved and published.`);
      await refresh();
    } catch (error) {
      setUploadPreviews((items) => items.map((item) => ({ ...item, progress: "error" })));
      toast.error(error instanceof Error ? error.message : "The photo could not be uploaded.");
    } finally {
      setUploadTarget(null);
      setTimeout(() => setUploadPreviews([]), 1600);
    }
  };

  const replace = (photo: PublicMedia, section: Section) => openPicker({ sectionKey: section.key, unitKey: section.unitKey, photoType: photo.photoType as PhotoType, replaceId: photo.id });
  const makeCover = async (photo: PublicMedia) => {
    await setCover.mutateAsync({ id: photo.id });
    toast.success("Cover photo updated.");
    await refresh();
  };
  const deletePhoto = async (photo: PublicMedia) => {
    if (!window.confirm("Are you sure you want to delete this photo?")) return;
    await remove.mutateAsync({ id: photo.id });
    toast.success("Photo deleted.");
    await refresh();
  };
  const dropPhoto = async (targetId: number) => {
    if (draggedId === null || draggedId === targetId) return;
    const sourceIndex = sectionMedia.findIndex((item) => item.id === draggedId);
    const targetIndex = sectionMedia.findIndex((item) => item.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const next = [...sectionMedia];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    await reorder.mutateAsync({ items: next.map((item, index) => ({ id: item.id, displayOrder: index })) });
    toast.success("Photo order updated.");
    setDraggedId(null);
    await refresh();
  };

  if (user?.role !== "admin") {
    return <div className="admin-forbidden"><ShieldCheck size={34} /><h1>Owner access only</h1><p>This workspace is reserved for authorized Le Grande owners and administrators.</p></div>;
  }

  return (
    <div className="media-admin">
      <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={onFiles} />
      <header className="media-admin__header">
        <div><p className="admin-kicker"><span /> Le Grande owner studio</p><h1>Media / Photos</h1><p className="admin-lead">Replace, organize, and publish the photography that shapes your guest experience.</p></div>
        <div className="media-admin__header-actions"><span className="live-badge"><CheckCircle2 size={15} /> Live updates on</span><button className="admin-outline-button" type="button" onClick={() => { toast.success("All edits are already live."); refresh(); }}><RefreshCw size={15} /> Save changes</button></div>
      </header>
      <div className="demo-banner"><FileImage size={18} /><div><strong>Demo images are active</strong><span>These are clearly marked sample photos. Replace them with your own property photography at any time.</span></div><button type="button" onClick={() => toast("Choose any image card below and select Replace.")}><ChevronRight size={18} /></button></div>
      <div className="media-admin__body">
        <aside className="media-nav" aria-label="Media sections">
          <div className="media-nav__label">Manage content</div>
          {sections.map((section) => {
            const active = activeSection === section.label;
            const count = media.filter((item) => item.sectionKey === section.key && (section.key !== "unit" || item.unitKey === section.unitKey)).length;
            return <button className={`media-nav__item ${active ? "is-active" : ""}`} type="button" key={section.label} onClick={() => selectSection(section)}><span className="media-nav__number">{section.eyebrow}</span><span>{section.label}</span><small>{count} photos</small><ChevronRight size={15} /></button>;
          })}
          <div className="media-nav__tip"><LayoutDashboard size={16} /><span>Public site reads only published media. Your edits appear without a code deployment.</span></div>
        </aside>
        <main className="media-workspace">
          <div className="media-workspace__top"><div><p className="admin-kicker"><span /> {currentSection.eyebrow} / {currentSection.label}</p><h2>{currentSection.label}</h2><p>{currentSection.description}</p></div><button className="admin-upload-button" type="button" onClick={() => openPicker({ sectionKey: currentSection.key, unitKey: currentSection.unitKey, photoType: currentSection.key === "hero" ? "cover" : currentSection.key === "unit" ? activeUnitType : "gallery" })}><Upload size={17} /> Add photos</button></div>
          {currentSection.key === "unit" && <div className="unit-type-tabs">{unitPhotoTypes.map(([value, label]) => <button className={activeUnitType === value ? "is-active" : ""} type="button" key={value} onClick={() => setActiveUnitType(value)}>{label}</button>)}</div>}
          {uploadPreviews.length > 0 && <div className="upload-queue"><div className="upload-queue__header"><strong>Uploading photos</strong><span>{uploadPreviews.filter((item) => item.progress === "done").length} / {uploadPreviews.length} complete</span></div><div className="upload-queue__items">{uploadPreviews.map((item) => <div className="upload-queue__item" key={item.id}><img src={item.url} alt="Upload preview" /><span>{item.name}</span>{item.progress === "done" ? <CheckCircle2 size={16} /> : item.progress === "error" ? <X size={16} /> : <span className="upload-spinner" />}</div>)}</div></div>}
          <div className="media-helper"><GripVertical size={16} /><span>Drag photos to reorder. The first photo is the cover unless you choose another.</span><span className="media-helper__format">JPG · PNG · WEBP · max 15 MB</span></div>
          {mediaQuery.isLoading ? <div className="media-empty"><span className="upload-spinner" /><p>Loading your media library…</p></div> : sectionMedia.length === 0 ? <div className="media-empty"><ImagePlus size={38} /><h3>Your gallery is ready for its first photo</h3><p>Select photos from your phone, tablet, or desktop to begin.</p><button className="admin-upload-button" type="button" onClick={() => openPicker({ sectionKey: currentSection.key, unitKey: currentSection.unitKey, photoType: currentSection.key === "unit" ? activeUnitType : "gallery" })}><Upload size={16} /> Upload photo</button></div> : <div className="media-grid">{sectionMedia.map((photo, index) => <article className={`media-card ${photo.isDemo ? "is-demo" : ""}`} key={photo.id} draggable onDragStart={() => setDraggedId(photo.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => dropPhoto(photo.id)}><div className="media-card__image"><MediaImage src={photo.imageUrl || PLACEHOLDER_IMAGE} alt={photo.imageAlt} /><span className="media-card__drag"><GripVertical size={16} /></span>{photo.isCover ? <span className="cover-badge"><Star size={12} fill="currentColor" /> Cover</span> : null}<span className="media-card__index">{String(index + 1).padStart(2, "0")}</span></div><div className="media-card__body"><div className="media-card__meta"><span className={photo.isDemo ? "demo-tag" : "live-tag"}>{photo.isDemo ? "Demo / sample" : "Published"}</span><span>{photo.photoType}</span></div><strong>{photo.imageAlt}</strong><small>{photo.fileName || "Owner media"}</small><div className="media-card__actions"><a href={photo.imageUrl} target="_blank" rel="noreferrer" className="icon-action" aria-label="View photo"><ExternalLink size={14} /> View</a><button type="button" className="icon-action" onClick={() => replace(photo, currentSection)}><RefreshCw size={14} /> Replace</button>{!photo.isCover && <button type="button" className="icon-action" onClick={() => makeCover(photo)}><Star size={14} /> Set as cover</button>}<button type="button" className="icon-action icon-action--danger" onClick={() => deletePhoto(photo)}><Trash2 size={14} /> Delete</button></div></div></article>)}</div>}
        </main>
      </div>
    </div>
  );
}

export default function MediaAdmin() {
  return <DashboardLayout><MediaAdminShell /></DashboardLayout>;
}
