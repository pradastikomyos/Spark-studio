import { supabase } from '../../../lib/supabase';
import { deleteDressingRoomImage, uploadDressingRoomImage } from '../../../utils/uploadDressingRoomImage';
import { toSlug } from './dressingRoomManagerHelpers';
import type { DressingRoomCollection, DressingRoomLook } from './dressingRoomManagerTypes';

export async function createDressingRoomCollection(params: {
  title: string;
  description: string;
  sortOrder: number;
}) {
  const { title, description, sortOrder } = params;
  const { error } = await supabase.from('dressing_room_collections').insert({
    title: title.trim(),
    slug: toSlug(title),
    description: description.trim() || null,
    sort_order: sortOrder,
  });
  if (error) throw error;
}

export async function toggleDressingRoomCollection(collection: DressingRoomCollection) {
  const { error } = await supabase
    .from('dressing_room_collections')
    .update({ is_active: !collection.is_active, updated_at: new Date().toISOString() })
    .eq('id', collection.id);
  if (error) throw error;
}

export async function deleteDressingRoomCollection(id: number) {
  const { error } = await supabase.from('dressing_room_collections').delete().eq('id', id);
  if (error) throw error;
}

export async function saveDressingRoomCollectionInfo(params: {
  id: number;
  title: string;
  description: string;
}) {
  const { id, title, description } = params;
  const slug = toSlug(title);
  const { error } = await supabase
    .from('dressing_room_collections')
    .update({
      title: title.trim(),
      description: description.trim() || null,
      slug,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw error;
  return slug;
}

export async function addDressingRoomLook(params: {
  collectionId: number;
  nextNumber: number;
  sortOrder: number;
}) {
  const { collectionId, nextNumber, sortOrder } = params;
  const { error } = await supabase.from('dressing_room_looks').insert({
    collection_id: collectionId,
    look_number: nextNumber,
    model_image_url: '',
    sort_order: sortOrder,
  });
  if (error) throw error;
}

export async function addDressingRoomPhoto(params: {
  collectionId: number;
  lookId: number;
  file: File;
  existingLooks: DressingRoomLook[];
}) {
  const { collectionId, lookId, file, existingLooks } = params;
  const url = await uploadDressingRoomImage(file, collectionId, lookId);
  const existingPhotos = existingLooks.find((look) => look.id === lookId)?.photos ?? [];
  const nextSortOrder = existingPhotos.length === 0 ? 0 : Math.max(...existingPhotos.map((photo) => photo.sort_order)) + 1;

  const { error: insertError } = await supabase.from('dressing_room_look_photos').insert({
    look_id: lookId,
    image_url: url,
    sort_order: nextSortOrder,
  });
  if (insertError) throw new Error(insertError.message);

  const existingCover = (existingLooks.find((look) => look.id === lookId)?.model_image_url ?? '').trim();
  if (!existingCover) {
    const { error: coverError } = await supabase
      .from('dressing_room_looks')
      .update({ model_image_url: url, updated_at: new Date().toISOString() })
      .eq('id', lookId);
    if (coverError) throw new Error(coverError.message);
  }

  return nextSortOrder;
}

export async function replaceDressingRoomPhoto(params: {
  collectionId: number;
  lookId: number;
  photoId: number;
  previousUrl: string;
  file: File;
}) {
  const { collectionId, lookId, photoId, previousUrl, file } = params;
  const url = await uploadDressingRoomImage(file, collectionId, lookId);
  const { error } = await supabase.from('dressing_room_look_photos').update({ image_url: url }).eq('id', photoId);
  if (error) throw new Error(error.message);
  if (previousUrl) await deleteDressingRoomImage(previousUrl);
}

export async function deleteDressingRoomPhoto(params: { photoId: number; imageUrl: string }) {
  const { photoId, imageUrl } = params;
  if (imageUrl) await deleteDressingRoomImage(imageUrl);
  const { error } = await supabase.from('dressing_room_look_photos').delete().eq('id', photoId);
  if (error) throw error;
}

export async function saveDressingRoomModelName(params: { lookId: number; modelName: string }) {
  const { lookId, modelName } = params;
  const { error } = await supabase
    .from('dressing_room_looks')
    .update({ model_name: modelName.trim() || null, updated_at: new Date().toISOString() })
    .eq('id', lookId);
  if (error) throw error;
}

export async function deleteDressingRoomLook(params: { lookId: number; imageUrl: string }) {
  const { lookId, imageUrl } = params;
  if (imageUrl) await deleteDressingRoomImage(imageUrl);
  const { error } = await supabase.from('dressing_room_looks').delete().eq('id', lookId);
  if (error) throw error;
}

export async function linkDressingRoomProduct(params: { lookId: number; variantId: number; sortOrder: number }) {
  const { lookId, variantId, sortOrder } = params;
  const { error } = await supabase.from('dressing_room_look_items').insert({
    look_id: lookId,
    product_variant_id: variantId,
    sort_order: sortOrder,
  });
  if (error) throw error;
}

export async function unlinkDressingRoomProduct(itemId: number) {
  const { error } = await supabase.from('dressing_room_look_items').delete().eq('id', itemId);
  if (error) throw error;
}
