import { Inject, Injectable } from '@nestjs/common';
import { FIREBASE_ADMIN } from '@integrations/firebase/firebase-admin.provider';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseProductsRepository {
  private db: admin.firestore.Firestore;

  constructor(@Inject(FIREBASE_ADMIN) private fb: admin.app.App) {
    this.db = admin.firestore(this.fb);
  }

  private mapDoc(doc: FirebaseFirestore.DocumentSnapshot): any {
    const data = doc.data() || {};

    return {
      id: doc.id,
      Title: data['Title'] ?? '',
      SKU: data['SKU'] ?? '',
      Stock: data['Stock'] ?? 0,
      Price: Number(data['Price'] ?? 0),
      SalePrice: Number(data['SalePrice'] ?? 0),
      Thumbnail: data['Thumbnail'] ?? '',
      Images: data['Images'] ?? [],
      CategoryIds: data['CategoryIds'] ?? [],
      Brand: data['Brand'] ?? null,
      Description: data['Description'] ?? '',
      ProductType: data['ProductType'] ?? '',
      ProductAttributes: data['ProductAttributes'] ?? [],
      ProductVariations: data['ProductVariations'] ?? [],
      ProductVisibility: data['ProductVisibility'] ?? 'ProductVisibility.hidden',
      DeliveryLess: Number(data['DeliveryLess'] ?? 0),
      CreatedAt: data['CreatedAt'] ?? null,
      UpdatedAt: data['UpdatedAt'] ?? null,
      SearchTitle: data['SearchTitle'] ?? '',
    };
  }

  // ✅ Obtener productos paginados (versión simple)
  // products.repository.ts (FirebaseProductsRepository)
  async getPaginated({ limit = 20, search = '', sku, cursor }: { limit?: number; search?: string; sku?: string; cursor?: string|null }) {
    // 1) Búsqueda por SKU exacto si viene
    if (sku) {
      const snap = await this.db.collection('Products').where('SKU', '==', sku).limit(limit).get();
      const items = snap.docs.map((d) => this.mapDoc(d));
      return { items, nextCursor: null };
    }

    // 2) Búsqueda por SearchTitle (prefijo)
    let q: FirebaseFirestore.Query = this.db.collection('Products').orderBy('SearchTitle');

    if (search.trim() !== '') {
      const s = search.toLowerCase().trim();
      q = q.startAt(s).endAt(s + '\uf8ff'); // equivalente a >= y <= sobre el mismo campo
    }

    if (cursor) {
      const docSnap = await this.db.collection('Products').doc(cursor).get();
      if (docSnap.exists) q = q.startAfter(docSnap);
    }

    const snap = await q.limit(limit).get();
    const items = snap.docs.map((d) => this.mapDoc(d));
    const nextCursor = snap.docs.length ? snap.docs[snap.docs.length - 1].id : null;

    // 3) Fallback: si no hubo resultados y hay search, intenta por Title (para docs viejos sin SearchTitle)
    if (!items.length && search.trim()) {
      let q2: FirebaseFirestore.Query = this.db.collection('Products').orderBy('Title');
      const s = search.toLowerCase().trim();
      q2 = q2.startAt(s).endAt(s + '\uf8ff');
      const snap2 = await q2.limit(limit).get();
      return {
        items: snap2.docs.map((d) => this.mapDoc(d)),
        nextCursor: snap2.docs.length ? snap2.docs[snap2.docs.length - 1].id : null,
      };
    }

    return { items, nextCursor };
  }

  // ✅ obtener producto por ID
  async getById(id: string) {
    const snap = await this.db.collection('Products').doc(id).get();
    if (!snap.exists) return null;
    return this.mapDoc(snap);
  }

  // ✅ crear
  async create(data: any) {
    data.CreatedAt = new Date().toISOString();
    data.UpdatedAt = new Date().toISOString();

    const ref = await this.db.collection('Products').add(data);
    const snap = await ref.get();
    return this.mapDoc(snap);
  }

  // ✅ actualizar
  async update(id: string, data: any) {
    data.UpdatedAt = new Date().toISOString();
    await this.db.collection('Products').doc(id).update(data);
    const snap = await this.db.collection('Products').doc(id).get();
    return this.mapDoc(snap);
  }

  // ✅ eliminar
  async delete(id: string) {
    await this.db.collection('Products').doc(id).delete();
  }
}
