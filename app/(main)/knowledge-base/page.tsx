"use client";

import { useState } from "react";
import CollectionsList from "@/app/components/knowledge-base/CollectionsList";
import CreateCollectionForm from "@/app/components/knowledge-base/CreateCollectionForm";
import CollectionDetail from "@/app/components/knowledge-base/CollectionDetail";
import DocumentPickerModal from "@/app/components/knowledge-base/DocumentPickerModal";
import DeleteCollectionModal from "@/app/components/knowledge-base/DeleteCollectionModal";
import DocumentPreviewModal from "@/app/components/knowledge-base/DocumentPreviewModal";
import { Modal, Loader } from "@/app/components/ui";
import { Sidebar, PageHeader } from "@/app/components";
import { BookOpenIcon } from "@/app/components/icons";
import { useApp } from "@/app/lib/context/AppContext";
import { useCollections } from "@/app/hooks/useCollections";
import { Document } from "@/app/lib/types/document";

export default function KnowledgeBasePage() {
  const { sidebarCollapsed } = useApp();
  const {
    collections,
    availableDocuments,
    selectedCollection,
    isLoading,
    isLoadingDetail,
    isCreating,
    setSelectedCollection,
    fetchCollectionDetails,
    createCollection,
    deleteCollection,
    fetchAndPreviewDoc,
  } = useCollections();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showDocumentPicker, setShowDocumentPicker] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [collectionToDelete, setCollectionToDelete] = useState<string | null>(
    null,
  );
  const [showDocPreviewModal, setShowDocPreviewModal] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const [collectionName, setCollectionName] = useState("");
  const [collectionDescription, setCollectionDescription] = useState("");
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(
    new Set(),
  );

  const toggleDocumentSelection = (documentId: string) => {
    const newSelection = new Set(selectedDocuments);
    if (newSelection.has(documentId)) {
      newSelection.delete(documentId);
    } else {
      newSelection.add(documentId);
    }
    setSelectedDocuments(newSelection);
  };

  const handleSelectCollection = (collectionId: string) => {
    setShowCreateForm(false);
    setShowDocumentPicker(false);
    fetchCollectionDetails(collectionId);
  };

  const handleCreateNew = () => {
    setShowCreateForm(true);
    setSelectedCollection(null);
  };

  const handleCancelCreate = () => {
    setShowCreateForm(false);
    setShowDocumentPicker(false);
    setCollectionName("");
    setCollectionDescription("");
    setSelectedDocuments(new Set());
  };

  const handleCreateClick = async () => {
    const params = {
      name: collectionName,
      description: collectionDescription,
      documentIds: Array.from(selectedDocuments),
    };
    setShowCreateForm(false);
    setShowDocumentPicker(false);
    setCollectionName("");
    setCollectionDescription("");
    setSelectedDocuments(new Set());
    await createCollection(params);
  };

  const handleRequestDelete = (collectionId: string) => {
    setCollectionToDelete(collectionId);
    setShowConfirmDelete(true);
  };

  const handleConfirmDelete = async () => {
    if (!collectionToDelete) return;
    setShowConfirmDelete(false);
    const id = collectionToDelete;
    setCollectionToDelete(null);
    await deleteCollection(id);
  };

  const handlePreviewDocument = async (firstDocument: Document) => {
    setShowDocPreviewModal(true);
    setPreviewDoc(firstDocument);
    setIsPreviewLoading(true);
    try {
      const enriched = await fetchAndPreviewDoc(firstDocument);
      setPreviewDoc(enriched);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleSelectPreviewDoc = async (doc: Document) => {
    setPreviewDoc(doc);
    setIsPreviewLoading(true);
    try {
      const enriched = await fetchAndPreviewDoc(doc);
      setPreviewDoc(enriched);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-bg-primary">
      <Sidebar collapsed={sidebarCollapsed} activeRoute="/knowledge-base" />

      <div className="flex-1 flex flex-col overflow-hidden">
        <PageHeader
          title="Knowledge Base"
          subtitle="Manage your knowledge bases for RAG"
        />

        <div className="flex-1 overflow-hidden flex">
          <CollectionsList
            collections={collections}
            selectedCollection={selectedCollection}
            isLoading={isLoading}
            onSelect={handleSelectCollection}
            onRequestDelete={handleRequestDelete}
            onCreateNew={handleCreateNew}
          />

          <div className="w-2/3 hidden lg:flex flex-col">
            {showCreateForm ? (
              <CreateCollectionForm
                collectionName={collectionName}
                setCollectionName={setCollectionName}
                collectionDescription={collectionDescription}
                setCollectionDescription={setCollectionDescription}
                selectedDocuments={selectedDocuments}
                availableDocuments={availableDocuments}
                onToggleDocument={toggleDocumentSelection}
                onOpenDocumentPicker={() => setShowDocumentPicker(true)}
                isCreating={isCreating}
                onCancel={handleCancelCreate}
                onCreate={handleCreateClick}
              />
            ) : isLoadingDetail && !selectedCollection ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader size="md" message="Loading knowledge base…" />
              </div>
            ) : selectedCollection ? (
              <div className="flex-1 min-h-0 flex flex-col relative">
                <CollectionDetail
                  collection={selectedCollection}
                  onRequestDelete={handleRequestDelete}
                  onPreviewDocument={handlePreviewDocument}
                />
                {isLoadingDetail && (
                  <div className="absolute inset-0 flex items-center justify-center bg-bg-primary/60 backdrop-blur-[1px] pointer-events-none">
                    <Loader
                      size="md"
                      message={`Loading ${selectedCollection.name}…`}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center px-6">
                <div className="text-center max-w-sm">
                  <div className="mx-auto mb-4 inline-flex items-center justify-center w-14 h-14 rounded-full bg-accent-primary/10">
                    <BookOpenIcon className="w-7 h-7 text-accent-primary" />
                  </div>
                  <p className="text-base font-semibold text-text-primary mb-1">
                    No knowledge base selected
                  </p>
                  <p className="text-sm text-text-secondary">
                    Pick one from the list to view its documents and metadata,
                    or create a new knowledge base to get started.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile/tablet — create form rendered in a modal */}
      <div className="lg:hidden">
        <Modal
          open={showCreateForm}
          onClose={handleCancelCreate}
          maxWidth="max-w-2xl"
          maxHeight="max-h-[90vh]"
        >
          <CreateCollectionForm
            collectionName={collectionName}
            setCollectionName={setCollectionName}
            collectionDescription={collectionDescription}
            setCollectionDescription={setCollectionDescription}
            selectedDocuments={selectedDocuments}
            availableDocuments={availableDocuments}
            onToggleDocument={toggleDocumentSelection}
            onOpenDocumentPicker={() => setShowDocumentPicker(true)}
            isCreating={isCreating}
            onCancel={handleCancelCreate}
            onCreate={handleCreateClick}
          />
        </Modal>

        <Modal
          open={!showCreateForm && !!selectedCollection}
          onClose={() => setSelectedCollection(null)}
          maxWidth="max-w-2xl"
          maxHeight="max-h-[90vh]"
        >
          {selectedCollection && (
            <CollectionDetail
              collection={selectedCollection}
              onRequestDelete={(id) => {
                setSelectedCollection(null);
                handleRequestDelete(id);
              }}
              onPreviewDocument={handlePreviewDocument}
            />
          )}
        </Modal>
      </div>

      <DeleteCollectionModal
        open={showConfirmDelete}
        onClose={() => {
          setShowConfirmDelete(false);
          setCollectionToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
      />

      <DocumentPickerModal
        open={showDocumentPicker}
        onClose={() => setShowDocumentPicker(false)}
        availableDocuments={availableDocuments}
        selectedDocuments={selectedDocuments}
        onToggleDocument={toggleDocumentSelection}
        onClearAll={() => setSelectedDocuments(new Set())}
        onDone={() => setShowDocumentPicker(false)}
      />

      <DocumentPreviewModal
        open={showDocPreviewModal && !!selectedCollection?.documents}
        onClose={() => {
          setShowDocPreviewModal(false);
          setPreviewDoc(null);
        }}
        documents={selectedCollection?.documents ?? []}
        previewDoc={previewDoc}
        isLoading={isPreviewLoading}
        onSelectDocument={handleSelectPreviewDoc}
      />
    </div>
  );
}
