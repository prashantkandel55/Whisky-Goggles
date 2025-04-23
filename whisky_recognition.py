import cv2
import numpy as np
import pandas as pd
import torch
import torchvision.transforms as transforms
from PIL import Image
import os
from io import BytesIO
from sklearn.metrics.pairwise import cosine_similarity
from tqdm import tqdm
import pytesseract
from typing import List, Dict, Any, Tuple

class WhiskyLabelRecognizer:
    def __init__(self, dataset_path):
        self.dataset = pd.read_csv(dataset_path)
        self.model = self._load_model()
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406],
                             std=[0.229, 0.224, 0.225])
        ])
        self.reference_features = self._precompute_features()

    def _load_model(self):
        # Load pre-trained ResNet model
        model = torch.hub.load('pytorch/vision:v0.10.0', 'resnet50', pretrained=True)
        model.eval()
        return model

    def _precompute_features(self):
        features = []
        print("Precomputing features for reference images...")
        for img_path in tqdm(self.dataset['image_url']):
            try:
                # Serve images from public/images if available
                public_img_path = os.path.join('public', 'images', os.path.basename(img_path))
                if os.path.exists(public_img_path):
                    img = Image.open(public_img_path).convert('RGB')
                elif os.path.exists(img_path):
                    img = Image.open(img_path).convert('RGB')
                else:
                    # Fallback for URLs if local image missing
                    from urllib.request import urlopen
                    response = urlopen(img_path)
                    img = Image.open(BytesIO(response.read())).convert('RGB')
                img_tensor = self.transform(img).unsqueeze(0)
                with torch.no_grad():
                    feature = self.model(img_tensor)
                features.append(feature.squeeze().numpy())
            except Exception as e:
                print(f"Error processing {img_path}: {e}")
                features.append(np.zeros(1000))  # Placeholder for failed images
        return np.array(features)

    def preprocess_image(self, img: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """Preprocess image for both deep learning and traditional CV approaches"""
        img_cv = img.copy()
        gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
        thresh = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
        )
        return gray, thresh

    def extract_text(self, img: np.ndarray) -> str:
        """Extract text from image using OCR"""
        try:
            text = pytesseract.image_to_string(img)
            return text.strip()
        except Exception as e:
            print(f"OCR Error: {e}")
            return ""

    def extract_features_cv(self, img: np.ndarray) -> Tuple[List[cv2.KeyPoint], np.ndarray]:
        """Extract SIFT features from image"""
        sift = cv2.SIFT_create()
        keypoints, descriptors = sift.detectAndCompute(img, None)
        return keypoints, descriptors

    def process_image(self, image_path: str) -> Dict[str, Any]:
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Could not load image: {image_path}. Please ensure the file is a valid image and accessible.")
        try:
            gray, thresh = self.preprocess_image(img)
            text = self.extract_text(thresh)
            keypoints, cv_features = self.extract_features_cv(gray)
            img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            pil_img = Image.fromarray(img_rgb)
            img_tensor = self.transform(pil_img).unsqueeze(0)
            with torch.no_grad():
                dl_features = self.model(img_tensor)
            return {
                'dl_features': dl_features.squeeze().numpy(),
                'cv_features': cv_features,
                'text': text,
                'keypoints': keypoints
            }
        except Exception as e:
            raise RuntimeError(f"Error during image processing: {str(e)}")

    def match_bottle(self, image_path: str, top_k: int = 5) -> List[Dict[str, Any]]:
        query_features = self.process_image(image_path)
        dl_similarities = cosine_similarity(
            query_features['dl_features'].reshape(1, -1), 
            self.reference_features
        )
        FLANN_INDEX_KDTREE = 1
        index_params = dict(algorithm=FLANN_INDEX_KDTREE, trees=5)
        search_params = dict(checks=50)
        flann = cv2.FlannBasedMatcher(index_params, search_params)
        top_indices = np.argsort(dl_similarities[0])[-top_k*2:][::-1]
        results = []
        for idx in top_indices:
            bottle_info = self.dataset.iloc[idx]
            confidence = float(dl_similarities[0][idx])
            results.append({
                'name': bottle_info['name'],
                'confidence': confidence,
                'type': bottle_info['spirit_type'],
                'size_ml': bottle_info['size'],
                'abv': bottle_info['abv'],
                'msrp': bottle_info['avg_msrp'],
                'image_url': bottle_info['image_url'],
                'matched_text': query_features['text']
            })
        results.sort(key=lambda x: x['confidence'], reverse=True)
        return results[:top_k]

def main():
    try:
        print("Initializing Whisky Label Recognition System...")
        recognizer = WhiskyLabelRecognizer('501 Bottle Dataset - Sheet1 (local images).csv')
        image_path = 'test_images/test_bottle.jpg'
        print(f"\nProcessing image: {image_path}")
        if not os.path.exists(image_path):
            print(f"\nError: Test image not found at {image_path}")
            print("Please place a test image in the test_images directory")
            return
        matches = recognizer.match_bottle(image_path)
        print("\nRecognition Results:")
        for match in matches:
            print(f"- {match['name']} (Confidence: {match['confidence']*100:.2f}%)")
            print(f"   Type: {match['type']}")
            print(f"   Size: {match['size_ml']}ml")
            print(f"   ABV: {match['abv']}%")
            print(f"   MSRP: ${match['msrp']}")
            if match['matched_text']:
                print(f"   Matched Text: {match['matched_text']}")
    except FileNotFoundError:
        print("\nError: Dataset file '501 Bottle Dataset - Sheet1 (local images).csv' not found")
        print("Please ensure the dataset file is in the correct location")
    except Exception as e:
        print(f"\nError: {e}")
        print("If this is a dependency error, please ensure all required packages are installed")

# if __name__ == '__main__':
#     main()