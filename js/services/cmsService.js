// ========================================================
// SWIFT EXPRESS LOGISTICS - DUAL-SYNC CMS & CONTENT SERVICE
// Dynamic page management, Blog, Testimonials, FAQ with Supabase Backend
// ========================================================

import { dbEngine } from './supabaseClient.js';

class CMSService {
  async getCMSContent(sectionId) {
    if (dbEngine.isRealSupabase) {
      try {
        const { data, error } = await dbEngine.client.from('cms_content').select('*').eq('id', sectionId).single();
        if (!error && data && data.content) return data.content;
      } catch (err) {
        console.warn('Supabase CMS fetch notice:', err.message);
      }
    }
    const cmsData = JSON.parse(localStorage.getItem('sel_cms') || '{}');
    return cmsData[sectionId] || null;
  }

  async updateCMSContent(sectionId, sectionName, contentObj) {
    // 1. Save locally
    const cmsData = JSON.parse(localStorage.getItem('sel_cms') || '{}');
    cmsData[sectionId] = contentObj;
    localStorage.setItem('sel_cms', JSON.stringify(cmsData));

    // 2. Sync to Supabase Backend
    if (dbEngine.isRealSupabase) {
      try {
        await dbEngine.client.from('cms_content').upsert({
          id: sectionId,
          section_name: sectionName,
          content: contentObj,
          updated_at: new Date().toISOString()
        });
      } catch (err) {
        console.warn('Supabase CMS update notice:', err.message);
      }
    }
  }

  async getFAQs() {
    let cloudFaqs = [];
    if (dbEngine.isRealSupabase) {
      try {
        const { data, error } = await dbEngine.client.from('faqs').select('*').order('sort_order', { ascending: true });
        if (!error && data && data.length > 0) cloudFaqs = data;
      } catch (err) {
        console.warn('Supabase FAQ fetch notice:', err.message);
      }
    }

    const localFaqs = dbEngine.getCollection('faqs');
    return cloudFaqs.length > 0 ? cloudFaqs : localFaqs;
  }

  async addFAQ(faqData) {
    const localFaq = { id: "faq-" + Date.now(), ...faqData };
    
    // 1. Local Storage save
    const faqs = dbEngine.getCollection('faqs');
    faqs.push(localFaq);
    dbEngine.setCollection('faqs', faqs);

    // 2. Sync to Supabase Backend
    if (dbEngine.isRealSupabase) {
      try {
        const cloudPayload = { ...localFaq };
        delete cloudPayload.id; // Let PostgreSQL auto-generate UUID

        const { data, error } = await dbEngine.client.from('faqs').insert([cloudPayload]).select().single();
        if (!error && data) return data;
      } catch (err) {
        console.warn('Supabase FAQ insert notice:', err.message);
      }
    }

    return localFaq;
  }

  async getTestimonials() {
    let cloudTestimonials = [];
    if (dbEngine.isRealSupabase) {
      try {
        const { data, error } = await dbEngine.client.from('testimonials').select('*').eq('is_approved', true);
        if (!error && data && data.length > 0) cloudTestimonials = data;
      } catch (err) {
        console.warn('Supabase Testimonials fetch notice:', err.message);
      }
    }

    const localTestimonials = dbEngine.getCollection('testimonials');
    return cloudTestimonials.length > 0 ? cloudTestimonials : localTestimonials;
  }

  async getBlogPosts() {
    let cloudPosts = [];
    if (dbEngine.isRealSupabase) {
      try {
        const { data, error } = await dbEngine.client.from('blog_posts').select('*').order('published_at', { ascending: false });
        if (!error && data && data.length > 0) cloudPosts = data;
      } catch (err) {
        console.warn('Supabase Blog fetch notice:', err.message);
      }
    }

    const localPosts = dbEngine.getCollection('blog_posts');
    return cloudPosts.length > 0 ? cloudPosts : localPosts;
  }

  async addBlogPost(postData) {
    const localPost = {
      id: "bp-" + Date.now(),
      slug: postData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
      published_at: new Date().toISOString(),
      ...postData
    };

    // 1. Save locally
    const posts = dbEngine.getCollection('blog_posts');
    posts.unshift(localPost);
    dbEngine.setCollection('blog_posts', posts);

    // 2. Sync to Supabase Backend
    if (dbEngine.isRealSupabase) {
      try {
        const cloudPayload = { ...localPost };
        delete cloudPayload.id; // Let PostgreSQL generate UUID

        const { data, error } = await dbEngine.client.from('blog_posts').insert([cloudPayload]).select().single();
        if (!error && data) return data;
      } catch (err) {
        console.warn('Supabase blog insert notice:', err.message);
      }
    }

    return localPost;
  }
}

export const cmsService = new CMSService();
