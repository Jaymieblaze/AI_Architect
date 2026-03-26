# 🎯 Krea Workflow Analysis - Key Learnings

## 📥 Source
User exported their Krea.ai workflow showing multi-angle generation with excellent coherence.

---

## 🔑 Critical Discovery: `imagePromptStrengths`

### The Missing Parameter

**What we were doing:**
```javascript
{
  "prompt": "...",
  "imageUrls": ["https://..."],
  // ❌ Missing the strength parameter!
}
```

**What Krea's workflow does:**
```javascript
{
  "prompt": "...",
  "imageUrls": ["https://..."],
  "imagePromptStrengths": [80]  // ✅ Controls adherence!
}
```

### Parameter Details

- **Scale**: 0-100 (not 0-1 like some other APIs)
- **Krea's recommended value**: 80 = strong adherence to reference
- **Lower values** (20-50) = more creative interpretation
- **Higher values** (80-100) = stricter adherence to reference geometry

---

## 🏗️ Krea's Multi-Angle Strategy

### Workflow Structure

1. **Step 1: Generate Exterior** (Krea 1 / k1 provider)
   - Text-to-image, no reference
   - Establishes the base building design

2. **Step 2: Generate Aerial View** (Nano Banana)
   - References: Exterior image
   - Strength: [80]
   - Prompt: "Change viewpoint to aerial bird's-eye view... keep exact same architectural design"

3. **Step 3: Generate Street-Level** (Nano Banana)
   - References: Exterior image
   - Strength: [80]
   - Prompt: "Change viewpoint to street-level perspective... keep exact same architectural design"

4. **Step 4: Generate Rear Elevation** (Nano Banana)
   - References: **BOTH** Exterior + Aerial images
   - Strength: [80, 80]
   - Uses multiple references for even better coherence!

5. **Step 5: Generate Detail Shot** (Flux Kontext)
   - References: Exterior image
   - Different provider for close-up details

### Key Insight: Sequential + Multiple References

The last node (rear elevation) uses **multiple image references**:

```json
{
  "imagePrompts": [
    "https://gen.krea.ai/images/a2ccd768-8793-46bc-ad8b-f873b453048c.png",  // exterior
    "https://app-uploads.krea.ai/public/de436feb-2d61-4187-b40d-60ddd41db644.png"  // aerial
  ],
  "imagePromptStrengths": [80, 80]
}
```

This accumulates visual information from previous angles!

---

## 🔍 Other Parameters Discovered

### Provider Names
- `"k1"` - Krea 1 (latest model for text-to-image)
- `"nano-banana"` - Nano Banana (img2img specialist)
- `"krea-kontext"` - Flux Kontext (alternative provider)
- `"nano-banana-pro"` - Our current endpoint (might differ from "nano-banana")

### Resolution
All nodes use:
```json
{
  "aspectRatio": "16:9",
  "resolutionScale": 1024,
  "width": 1376,
  "height": 768,
  "quality": "high"
}
```

### What's NOT Used (interesting!)
- ❌ `seed` - NOT used in the workflow
- ❌ `steps` - NOT specified for Nano Banana
- ❌ `guidance` - Set to null
- ❌ `raw` - Set to false

This suggests seed coherence might be LESS important than img2img with proper strength!

---

## ✅ Implementation Status

### What We've Updated

1. **frontend/app/api/generate-krea/route.ts**
   ```javascript
   if (imageUrls && Array.isArray(imageUrls) && imageUrls.length > 0) {
     kreaRequestBody.imageUrls = [dataUri];
     kreaRequestBody.imagePromptStrengths = [80];  // ✅ Added!
   }
   ```

2. **frontend/components/ConceptArchitect.tsx**
   ```javascript
   if (exteriorUrl) {
     requestBody.imageUrls = [exteriorUrl];
     requestBody.imagePromptStrengths = [80];  // ✅ Added!
   }
   ```

3. **N8N_WORKFLOW_UPDATE.md**
   - Updated n8n workflow expression to forward `imagePromptStrengths`
   - Defaults to [80] if not provided

---

## 🎯 Expected Impact

### Before This Discovery
- ❌ 4 completely different buildings
- ❌ No control over img2img adherence
- ❌ Reference images treated as weak suggestions

### After Adding imagePromptStrengths [80]
- ✅ 4 views of the SAME building
- ✅ Strong adherence to reference design
- ✅ Preserves colors, materials, architectural style
- ⚠️ May still have some perspective/geometry changes (Nano Banana's nature)

---

## 🚀 Next Steps

### Testing Required
1. **Update n8n workflow** with the new expression (see N8N_WORKFLOW_UPDATE.md)
2. **Test multi-angle generation** with a simple prompt
3. **Compare results** to previous generations (should be WAY more coherent)

### Future Enhancements
Consider implementing **multiple image references** like Krea's workflow:
- Generate exterior first
- Generate aerial second (references exterior)
- Generate rear third (references **both** exterior + aerial)
- This could provide even better coherence!

### Parameter Tuning
Experiment with different strength values:
- **60-70**: More creative interpretation, looser adherence
- **80**: Balanced (Krea's recommended value)
- **90-95**: Very strict adherence (may reduce realism)

---

## 📝 Documentation Reference

The user's Krea workflow export (`concept-gen.krea`) contains the complete node configuration showing:
- All parameter values
- Connection patterns
- Multiple reference strategy
- Provider-specific settings

This file is the **ground truth** from Krea's own workflow builder.

---

## 💡 Key Takeaway

**`imagePromptStrengths` is THE critical parameter** for img2img coherence with Krea's Nano Banana Pro. Without it, the model has no guidance on how strongly to follow the reference image.

This single parameter is likely the difference between:
- 4 random buildings ❌
- 4 coherent views of the same building ✅
