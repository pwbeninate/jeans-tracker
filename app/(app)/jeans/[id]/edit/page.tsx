import { notFound } from "next/navigation";
import { JeanForm } from "@/components/jean-form";
import { auth } from "@/lib/auth";
import { ownedJean } from "@/lib/queries";

export default async function EditJeanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const jean = await ownedJean(session!.user.id, id).catch(() => null);
  if (!jean) notFound();
  return (
    <>
      <h1 className="mb-4 text-xl font-semibold">Edit {jean.brand} {jean.name}</h1>
      <JeanForm id={id} initial={{ ...jean, purchasePrice: jean.purchasePrice == null ? null : Number(jean.purchasePrice) }} />
    </>
  );
}
