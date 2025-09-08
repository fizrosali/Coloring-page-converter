
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { generateColoringPage } from './services/geminiService';
import { UploadIcon, DownloadIcon, ImageIcon, SparklesIcon, BackIcon } from './components/icons';
import Spinner from './components/Spinner';

interface UploadedFile {
  base64: string;
  mimeType: string;
  previewUrl: string;
}

type LineThickness = 'thin' | 'medium' | 'bold';
type ImageQuality = 'low' | 'medium' | 'high';

const UPLOADED_FILE_KEY = 'coloringPageCreator-uploadedFile';
const GENERATED_IMAGE_KEY = 'coloringPageCreator-generatedImage';


const App: React.FC = () => {
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lineThickness, setLineThickness] = useState<LineThickness>('medium');
  const [imageQuality, setImageQuality] = useState<ImageQuality>('medium');

  // Load from local storage on initial render
  useEffect(() => {
    try {
      const storedFileJSON = localStorage.getItem(UPLOADED_FILE_KEY);
      const storedGeneratedImage = localStorage.getItem(GENERATED_IMAGE_KEY);

      if (storedFileJSON) {
        const storedFile: { base64: string, mimeType: string } = JSON.parse(storedFileJSON);
        if (storedFile.base64 && storedFile.mimeType) {
            setUploadedFile({
                ...storedFile,
                previewUrl: `data:${storedFile.mimeType};base64,${storedFile.base64}`,
            });
        }
      }

      if (storedGeneratedImage) {
        setGeneratedImage(storedGeneratedImage);
      }
    } catch (err) {
      console.error("Failed to load from local storage:", err);
      // Clear potentially corrupted storage
      localStorage.removeItem(UPLOADED_FILE_KEY);
      localStorage.removeItem(GENERATED_IMAGE_KEY);
    }
  }, []); // Empty dependency array means this runs once on mount

  // Save to local storage whenever state changes
  useEffect(() => {
    try {
      if (uploadedFile) {
        // Don't store the temporary blob previewUrl, only the data needed to reconstruct it
        const fileToStore = {
          base64: uploadedFile.base64,
          mimeType: uploadedFile.mimeType,
        };
        localStorage.setItem(UPLOADED_FILE_KEY, JSON.stringify(fileToStore));
      } else {
        localStorage.removeItem(UPLOADED_FILE_KEY);
      }

      if (generatedImage) {
        localStorage.setItem(GENERATED_IMAGE_KEY, generatedImage);
      } else {
        localStorage.removeItem(GENERATED_IMAGE_KEY);
      }
    } catch (err) {
      console.error("Failed to save to local storage:", err);
    }
  }, [uploadedFile, generatedImage]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
          setError('Please upload a valid image file (PNG, JPG, etc.).');
          return;
      }
      setError(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1];
        setUploadedFile({
          base64: base64Data,
          mimeType: file.type,
          previewUrl: URL.createObjectURL(file),
        });
        setGeneratedImage(null);
      };
      reader.onerror = () => {
        setError("Failed to read the file.");
      }
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateClick = useCallback(async () => {
    if (!uploadedFile) {
      setError('Please upload an image first.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const generatedBase64 = await generateColoringPage(uploadedFile.base64, uploadedFile.mimeType, lineThickness, imageQuality);
      setGeneratedImage(`data:image/png;base64,${generatedBase64}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [uploadedFile, lineThickness, imageQuality]);

  const handleReset = () => {
    setUploadedFile(null);
    setGeneratedImage(null);
    setError(null);
    setIsLoading(false);
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) {
        fileInput.value = '';
    }
  };

  const renderInitialState = () => (
    <div className="w-full max-w-lg text-center">
      <h2 className="text-3xl font-bold text-gray-800 mb-2">Upload Your Image</h2>
      <p className="text-gray-600 mb-6">Convert any photo into a fun coloring page.</p>
      <label htmlFor="file-upload" className="group cursor-pointer w-full p-8 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center hover:border-indigo-500 hover:bg-indigo-50 transition-all duration-300">
        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4 group-hover:bg-indigo-100 transition-colors duration-300">
          <UploadIcon className="w-8 h-8 text-gray-500 group-hover:text-indigo-600 transition-colors duration-300" />
        </div>
        <p className="text-indigo-700 font-semibold">Click to upload or drag and drop</p>
        <p className="text-sm text-gray-500 mt-1">PNG, JPG, GIF up to 10MB</p>
      </label>
      <input id="file-upload" type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      {error && <p className="mt-4 text-red-500 bg-red-100 p-3 rounded-lg">{error}</p>}
    </div>
  );

  const renderProcessingState = () => uploadedFile && (
    <div className="w-full max-w-4xl text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Ready to Create?</h2>
        <p className="text-gray-600 mb-6">Your image is ready. Let's make it a coloring page!</p>
        <div className="bg-white p-6 rounded-2xl shadow-lg w-full flex flex-col items-center">
            <div className="w-full max-w-md mb-6">
                <img src={uploadedFile.previewUrl} alt="Uploaded preview" className="rounded-xl object-contain max-h-96 w-full" />
            </div>

            <div className="w-full max-w-xs flex flex-col items-center gap-6 mb-8">
              <div className="w-full">
                <label className="block text-center text-lg font-semibold text-gray-700 mb-3">Line Thickness</label>
                <div className="grid grid-cols-3 gap-2 bg-gray-100 p-1.5 rounded-full">
                  {(['thin', 'medium', 'bold'] as LineThickness[]).map((thickness) => (
                      <button
                          key={thickness}
                          onClick={() => setLineThickness(thickness)}
                          className={`px-4 py-2 text-sm font-semibold rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                              lineThickness === thickness
                              ? 'bg-indigo-600 text-white shadow'
                              : 'bg-transparent text-gray-600 hover:bg-gray-200'
                          }`}
                      >
                          {thickness.charAt(0).toUpperCase() + thickness.slice(1)}
                      </button>
                  ))}
                </div>
              </div>

              <div className="w-full">
                <label className="block text-center text-lg font-semibold text-gray-700 mb-3">Image Quality</label>
                <div className="grid grid-cols-3 gap-2 bg-gray-100 p-1.5 rounded-full">
                  {(['low', 'medium', 'high'] as ImageQuality[]).map((quality) => (
                      <button
                          key={quality}
                          onClick={() => setImageQuality(quality)}
                          className={`px-4 py-2 text-sm font-semibold rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                              imageQuality === quality
                              ? 'bg-indigo-600 text-white shadow'
                              : 'bg-transparent text-gray-600 hover:bg-gray-200'
                          }`}
                      >
                          {quality.charAt(0).toUpperCase() + quality.slice(1)}
                      </button>
                  ))}
                </div>
              </div>
            </div>


            {isLoading ? (
                <div className="flex flex-col items-center justify-center p-4">
                    <Spinner />
                    <p className="mt-3 text-indigo-600 font-medium animate-pulse">Creating your masterpiece...</p>
                </div>
            ) : (
                <div className="flex flex-col sm:flex-row gap-4">
                    <button onClick={handleReset} className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 rounded-full text-gray-700 font-semibold hover:bg-gray-100 transition-colors duration-200">
                        <BackIcon className="w-5 h-5" />
                        Choose Another
                    </button>
                    <button onClick={handleGenerateClick} className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-full hover:bg-indigo-700 transition-colors duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
                        <SparklesIcon className="w-5 h-5" />
                        Generate Coloring Page
                    </button>
                </div>
            )}
             {error && <p className="mt-6 text-red-500 bg-red-100 p-3 rounded-lg w-full max-w-md">{error}</p>}
        </div>
    </div>
  );

  const renderResultState = () => uploadedFile && generatedImage && (
     <div className="w-full max-w-6xl text-center">
      <h2 className="text-3xl font-bold text-gray-800 mb-2">Your Coloring Page is Ready!</h2>
      <p className="text-gray-600 mb-8">Download your new creation or start over with a new image.</p>

      <div className="grid md:grid-cols-2 gap-8 items-start">
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-lg">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Original Image</h3>
          <img src={uploadedFile.previewUrl} alt="Original" className="rounded-xl w-full" />
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-lg">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Coloring Page</h3>
          <img src={generatedImage} alt="Generated coloring page" className="rounded-xl w-full bg-white" />
        </div>
      </div>
      
      <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
          <button onClick={handleReset} className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 rounded-full text-gray-700 font-semibold hover:bg-gray-100 transition-colors duration-200">
              <BackIcon className="w-5 h-5" />
              Create Another
          </button>
          <a href={generatedImage} download="coloring-page.png" className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-full hover:bg-indigo-700 transition-colors duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
              <DownloadIcon className="w-5 h-5" />
              Download
          </a>
      </div>
    </div>
  );

  const CurrentView = useMemo(() => {
    if (generatedImage) {
      return renderResultState();
    }
    if (uploadedFile) {
      return renderProcessingState();
    }
    return renderInitialState();
  }, [uploadedFile, generatedImage, isLoading, error, lineThickness, imageQuality]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
        <header className="text-center mb-10">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">
                Coloring Page <span className="text-indigo-600">Creator</span>
            </h1>
            <p className="mt-3 text-lg text-gray-600 max-w-2xl mx-auto">
                Powered by Gemini, turning your photos into art.
            </p>
        </header>
        <main className="w-full flex justify-center">
            {CurrentView}
        </main>
        <footer className="text-center text-gray-500 mt-12 text-sm">
            <p>&copy; {new Date().getFullYear()} Coloring Page Creator. All rights reserved.</p>
        </footer>
    </div>
  );
};

export default App;
