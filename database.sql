-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  CONSTRAINT categories_pkey PRIMARY KEY (id)
);
CREATE TABLE public.document_categories (
  document_id uuid NOT NULL,
  category_id uuid NOT NULL,
  CONSTRAINT document_categories_pkey PRIMARY KEY (document_id, category_id),
  CONSTRAINT document_categories_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id),
  CONSTRAINT document_categories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id)
);
CREATE TABLE public.documents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  author text,
  type text NOT NULL CHECK (type = ANY (ARRAY['livre'::text, 'mémoire'::text, 'rapport'::text, 'autre'::text])),
  description text,
  year integer,
  file_url text NOT NULL,
  cover_url text,
  uploaded_at timestamp without time zone DEFAULT now(),
  views integer DEFAULT 0,
  downloads integer DEFAULT 0,
  CONSTRAINT documents_pkey PRIMARY KEY (id)
);
CREATE TABLE public.downloads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  document_id uuid,
  downloaded_at timestamp without time zone DEFAULT now(),
  CONSTRAINT downloads_pkey PRIMARY KEY (id),
  CONSTRAINT downloads_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT downloads_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id)
);




-- ===========================
--   TABLES DE BASE
-- ===========================

-- 1. CATEGORIES
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE
);

-- 2. DOCUMENTS
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  author text,
  type text NOT NULL CHECK (type = ANY (ARRAY['livre', 'mémoire', 'rapport', 'autre'])),
  description text,
  year integer,
  file_url text NOT NULL,
  cover_url text,
  uploaded_at timestamp DEFAULT now(),
  views integer DEFAULT 0,
  downloads integer DEFAULT 0
);

-- 3. DOCUMENT CATEGORIES (relation many-to-many)
CREATE TABLE public.document_categories (
  document_id uuid NOT NULL,
  category_id uuid NOT NULL,
  PRIMARY KEY (document_id, category_id),
  FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE
);

-- 4. DOWNLOADS
CREATE TABLE public.downloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  document_id uuid,
  downloaded_at timestamp DEFAULT now(),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL,
  FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE
);


-- ===========================
--   NOUVELLES TABLES POUR LA RECHERCHE
-- ===========================

-- 5. FILIERES
CREATE TABLE public.filieres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE
);

-- 6. NIVEAUX (lié à une filière)
CREATE TABLE public.niveaux (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filiere_id uuid NOT NULL REFERENCES public.filieres(id) ON DELETE CASCADE,
  name text NOT NULL,
  UNIQUE (filiere_id, name)
);

-- 7. Ajouter les colonnes dans documents pour filtrage
ALTER TABLE public.documents 
ADD COLUMN filiere_id uuid REFERENCES public.filieres(id) ON DELETE SET NULL,
ADD COLUMN niveau_id uuid REFERENCES public.niveaux(id) ON DELETE SET NULL,
ADD COLUMN epreuve_type text CHECK (epreuve_type = ANY (ARRAY['épreuve', 'mémoire']));
