
import faiss
import numpy as np
from .model_loader import ModelLoader
import sys
import os
from utils.text_cleaner import TextCleaner
from typing import List, Tuple, Optional
import re


class Chatbot:
   
    
    def __init__(self):
        """Initialize Chatbot with model loader and text cleaner."""
        self.model_loader = ModelLoader()
        self.text_cleaner = TextCleaner()
        self.index = None
        self.documents = []
        self.embeddings = None
    
    def build_index(self, text: str):
        """
        Build FAISS index from source text.
        
        Args:
            text: Source text to index
        """
        if not text or not text.strip():
            return
        
        try:
            # Get embedding model
            embedding_model = self.model_loader.get_model('embedding')
            
            # Split text into chunks (sentences)
            raw_sentences = self.text_cleaner.tokenize_sentences(text)
            
            if not raw_sentences:
                return
            
            # Filter out very short meaningless sentences
            valid_sentences = [s for s in raw_sentences if len(s.strip()) > 10]
            
            if not valid_sentences:
                return
                
            # Create sliding window chunks (group 3 sentences together with an overlap of 1)
            # This makes FAISS extremely powerful because embeddings now have full context!
            chunks = []
            window_size = 3
            stride = 2
            
            for i in range(0, len(valid_sentences), stride):
                chunk_group = valid_sentences[i:i + window_size]
                chunk_text = " ".join(chunk_group).strip()
                if len(chunk_text) > 30:
                    chunks.append(chunk_text)
                    
            if not chunks:
                chunks = valid_sentences
            
            # Generate embeddings for the rich chunks
            embeddings = embedding_model.encode(chunks, show_progress_bar=False)
            embeddings = np.array(embeddings).astype('float32')
            
            # Normalize embeddings for cosine similarity
            faiss.normalize_L2(embeddings)
            
            # Create FAISS index
            dimension = embeddings.shape[1]
            self.index = faiss.IndexFlatIP(dimension)  # Inner product for cosine similarity
            self.index.add(embeddings)
            
            # Store the rich chunk documents
            self.documents = chunks
            self.embeddings = embeddings
            
        except Exception as e:
            print(f"Error building index: {e}")
            self.index = None
            self.documents = []
    
    def search_relevant_context(self, query: str, top_k: int = 3) -> List[Tuple[str, float]]:
        """
        Search for relevant context using semantic similarity.
        
        Args:
            query: User question
            top_k: Number of top results to return
            
        Returns:
            List of (document, score) tuples
        """
        if not self.index or not self.documents:
            return []
        
        try:
            # Get embedding model
            embedding_model = self.model_loader.get_model('embedding')
            
            # Encode query
            query_embedding = embedding_model.encode([query], show_progress_bar=False)
            query_embedding = np.array(query_embedding).astype('float32')
            faiss.normalize_L2(query_embedding)
            
            # Search
            scores, indices = self.index.search(query_embedding, min(top_k, len(self.documents)))
            
            # Get relevant documents
            results = []
            for score, idx in zip(scores[0], indices[0]):
                if idx < len(self.documents) and idx >= 0:
                    results.append((self.documents[idx], float(score)))
            
            return results
            
        except Exception as e:
            print(f"Search error: {e}")
            return []
    
    def generate_answer(self, question: str, source_text: str) -> dict:
        """
        Generate answer to question using RAG approach with general knowledge fallback.
        
        Args:
            question: User question
            source_text: Source text to search in (can be empty for general questions)
            
        Returns:
            Dictionary with 'answer' and 'references' fields
        """
        if not question or not question.strip():
            return {
                'answer': "Please provide a valid question.",
                'references': []
            }
        
        # Handle general questions when no source text is provided
        if not source_text or not source_text.strip() or len(source_text.strip()) < 50:
            return self._handle_general_question(question)
        
        # Build index if not already built or if source changed
        if not self.index or len(self.documents) == 0:
            self.build_index(source_text)
        
        # Search for relevant context
        relevant_contexts = self.search_relevant_context(question, top_k=5)
        
        # Check if question is relevant to source text
        if not relevant_contexts or (relevant_contexts and relevant_contexts[0][1] < 0.3):
            # Low relevance - check if it's a general question
            return self._handle_general_question(question, source_text)
        
        # Combine relevant contexts
        context_text = ' '.join([ctx[0] for ctx in relevant_contexts[:3]])
        
        # Generate answer using context
        top_context = relevant_contexts[0][0]
        
        # Create a more natural answer
        answer = self._format_answer(question, top_context, context_text)
        
        # Extract references
        references = [ctx[0] for ctx in relevant_contexts[:3]]
        
        return {
            'answer': answer,
            'references': references
        }
    
    def _handle_general_question(self, question: str, source_text: str = "") -> dict:
        """
        Handle general questions that may not be in the source text.
        
        Args:
            question: User question
            source_text: Optional source text (may be empty)
            
        Returns:
            Dictionary with answer and references
        """
        question_lower = question.lower()
        
        # Common general knowledge responses
        general_responses = {
            'what is': "I can help explain concepts. Based on general knowledge, ",
            'who is': "I can provide information about people. Generally, ",
            'when is': "I can help with dates and timelines. Typically, ",
            'where is': "I can help with locations. Generally, ",
            'how to': "I can provide guidance on processes. Generally, ",
            'why': "I can help explain reasons. Typically, ",
            'explain': "I can help explain concepts. Generally, ",
            'define': "I can help define terms. Generally, ",
        }
        
        # Find matching prefix
        response_prefix = ""
        for key, prefix in general_responses.items():
            if question_lower.startswith(key):
                response_prefix = prefix
                break
        
        # If source text exists but question not found, provide helpful response
        if source_text and len(source_text.strip()) > 50:
            answer = f"I couldn't find specific information about '{question}' in the provided source material. {response_prefix}you may want to check the source document again or rephrase your question. If you're asking a general question, please note that I primarily answer based on the provided source text."
        else:
            answer = f"{response_prefix}I'm designed to answer questions based on provided source documents. Please upload or provide text content related to your question for the most accurate answers. For general questions, I can provide basic information, but detailed answers work best with relevant source material."
        
        return {
            'answer': answer,
            'references': []
        }
    
    def _format_answer(self, question: str, top_context: str, full_context: str) -> str:
        """
        Format answer from context.
        
        Args:
            question: User question
            top_context: Most relevant context sentence
            full_context: All relevant context
            
        Returns:
            Formatted answer
        """
        # Simple answer generation
        # In production, you could use GPT or another LLM here
        
        # Check if question is asking for definition/explanation
        question_lower = question.lower()
        
        # If asking about the overall video, provide the first and most relevant chunk combined
        if any(word in question_lower for word in ['what is this video', 'about', 'summarize', 'summary', 'overview']):
            # Provide a broad context
            return f"Based on the video's content:\n\n{top_context}"
            
        if any(word in question_lower for word in ['what', 'define', 'explain', 'meaning']):
            return f"{top_context}"
        
        # Default answer
        else:
            return f"{top_context}"
    
    def reset(self):
        """Reset the chatbot index and documents."""
        self.index = None
        self.documents = []
        self.embeddings = None

