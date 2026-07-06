import os
import pandas as pd
import numpy as np
from sqlalchemy import create_engine
import implicit
import scipy.sparse as sparse

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("Warning: DATABASE_URL not set in environment.")
else:
    engine = create_engine(DATABASE_URL)

class RecommendationEngine:
    def __init__(self):
        # Disable threading for implicit on some systems to avoid errors
        os.environ['OPENBLAS_NUM_THREADS'] = '1'
        self.model = implicit.als.AlternatingLeastSquares(factors=50, regularization=0.1, iterations=20, calculate_training_loss=True)
        self.user_item_matrix = None
        self.item_user_matrix = None
        self.user_mapping = {}
        self.reverse_user_mapping = {}
        self.item_mapping = {}
        self.reverse_item_mapping = {}
        self.is_trained = False

    def train(self):
        if not DATABASE_URL:
            print("Cannot train without DATABASE_URL.")
            return

        print("Fetching interactions from database...")
        # Read interactions from Postgres
        query = """
            SELECT user_id, item_id, event_type 
            FROM interactions
        """
        try:
            df = pd.read_sql(query, engine)
        except Exception as e:
            print(f"Error reading interactions: {e}")
            return
        
        if df.empty:
            print("No interactions found. Cannot train model.")
            return

        # Map event types to weights (implicit feedback)
        weights = {
            'purchase': 5,
            'rate': 4,
            'watch': 3,
            'click': 2,
            'view': 1
        }
        
        df['weight'] = df['event_type'].map(weights).fillna(1)
        df['score'] = df['weight']
        
        # Group by user and item, taking sum of scores
        grouped = df.groupby(['user_id', 'item_id'])['score'].sum().reset_index()

        # Create mappings
        unique_users = grouped['user_id'].unique()
        unique_items = grouped['item_id'].unique()

        self.user_mapping = {u: i for i, u in enumerate(unique_users)}
        self.reverse_user_mapping = {i: u for i, u in enumerate(unique_users)}
        
        self.item_mapping = {i_id: idx for idx, i_id in enumerate(unique_items)}
        self.reverse_item_mapping = {idx: i_id for idx, i_id in enumerate(unique_items)}

        # Map ids to indices
        grouped['user_idx'] = grouped['user_id'].map(self.user_mapping)
        grouped['item_idx'] = grouped['item_id'].map(self.item_mapping)

        # Create sparse matrices
        # implicit expects an item-user matrix for training
        self.item_user_matrix = sparse.csr_matrix(
            (grouped['score'].values, (grouped['item_idx'].values, grouped['user_idx'].values)),
            shape=(len(unique_items), len(unique_users))
        )
        
        self.user_item_matrix = self.item_user_matrix.T.tocsr()

        print(f"Training ALS model on {len(unique_users)} users and {len(unique_items)} items...")
        self.model.fit(self.item_user_matrix)
        self.is_trained = True
        print("Training complete.")

    def recommend_for_user(self, user_id, num_recommendations=20):
        if not self.is_trained or user_id not in self.user_mapping:
            return [] # Cold start
        
        user_idx = self.user_mapping[user_id]
        
        ids, scores = self.model.recommend(
            user_idx, 
            self.user_item_matrix[user_idx], 
            N=num_recommendations,
            filter_already_liked_items=True
        )
        
        recommendations = [
            {"item_id": int(self.reverse_item_mapping[idx]), "score": float(score)}
            for idx, score in zip(ids, scores)
        ]
        return recommendations
        
    def similar_items(self, item_id, num_items=10):
        if not self.is_trained or item_id not in self.item_mapping:
            return []
            
        item_idx = self.item_mapping[item_id]
        
        ids, scores = self.model.similar_items(item_idx, N=num_items+1)
        
        similar = []
        for idx, score in zip(ids, scores):
            if idx == item_idx:
                continue
            similar.append({"item_id": int(self.reverse_item_mapping[idx]), "score": float(score)})
            
        return similar[:num_items]

engine_instance = RecommendationEngine()
