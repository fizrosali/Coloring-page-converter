
import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";

type LineThickness = 'thin' | 'medium' | 'bold';
type ImageQuality = 'low' | 'medium' | 'high';

export async function generateColoringPage(
  base64ImageData: string,
  mimeType: string,
  lineThickness: LineThickness,
  imageQuality: ImageQuality
): Promise<string> {

  const thicknessDescription = {
    thin: 'thin and delicate outlines',
    medium: 'bold outlines',
    bold: 'extra bold and thick outlines',
  };

  const qualityDescription = {
    low: 'with simple details, suitable for young children',
    medium: 'with a moderate amount of detail',
    high: 'with intricate and fine details, suitable for adults',
  };

  const prompt = `Transform this image into a black and white coloring book page. 
The output should have clean, simple, and ${thicknessDescription[lineThickness]}. 
It should be ${qualityDescription[imageQuality]}.
Remove all shading, gradients, and colors. 
Focus on creating clear, distinct lines suitable for coloring. 
The final image should be purely line art.`;
    
  // API_KEY is automatically picked up from environment variables
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64ImageData,
              mimeType: mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
          // Both IMAGE and TEXT must be included for this model
          responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    // Find the image part in the response
    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

    if (imagePart && imagePart.inlineData) {
      return imagePart.inlineData.data;
    } else {
      // Check for safety ratings or other reasons for no image
      const rejectionReason = response.candidates?.[0]?.finishReason;
      if (rejectionReason === 'SAFETY' || rejectionReason === 'RECITATION') {
        throw new Error('Image generation was blocked due to safety or policy reasons.');
      }
      const textResponse = response.text?.trim();
      if (textResponse) {
         throw new Error(`The model returned a text response instead of an image: "${textResponse}"`);
      }
      throw new Error('Failed to generate an image. The model did not return image data.');
    }
  } catch (error) {
    console.error('Error generating coloring page:', error);
    if (error instanceof Error) {
        throw new Error(`An API error occurred: ${error.message}`);
    }
    throw new Error('An unknown error occurred while communicating with the API.');
  }
}
