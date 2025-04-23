from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from whisky_recognition import WhiskyLabelRecognizer
import tempfile
import os
import numpy as np

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the whisky recognizer
recognizer = WhiskyLabelRecognizer('501 Bottle Dataset - Sheet1 (local images).csv')

# Helper to convert all numpy types to native Python types
def convert_numpy(obj):
    if isinstance(obj, np.generic):
        return obj.item()
    if isinstance(obj, dict):
        return {k: convert_numpy(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [convert_numpy(i) for i in obj]
    return obj

@app.post("/api/recognize")
async def recognize_whisky(image: UploadFile = File(...)):
    try:
        # Create a temporary file to store the uploaded image
        with tempfile.NamedTemporaryFile(delete=False) as temp_image:
            contents = await image.read()
            temp_image.write(contents)
            temp_image.flush()

            # Process the image using the recognizer
            results = recognizer.match_bottle(temp_image.name)

        # Clean up the temporary file
        os.unlink(temp_image.name)

        return {
            "success": True,
            "results": convert_numpy(results)
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)