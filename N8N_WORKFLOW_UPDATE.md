# n8n Workflow Update Instructions

## ⚠️ IMPORTANT: Frontend is in Backward-Compatible Mode

The multi-angle feature currently works **without** these updates, but you'll get **4 different buildings**.

To get **4 views of the SAME building**, follow these 3 steps:

---

## Step 1: Update n8n Workflow

### Instructions:

1. **Open n8n** at http://localhost:5678
2. **Open your workflow** ("My workflow")
3. **Click on the "Krea AI Generator" node** (HTTP Request node)
4. **Update the JSON Body** field

#### Current JSON Body:
```json
{
  "prompt": "Architectural render of {{$json.body.user_prompt}}, photorealistic architectural photography, parametric design elements, natural lighting, high-end materials, 8k resolution, highly detailed, professional architectural visualization",
  "width": 1024,
  "height": 576,
  "steps": 28
}
```

#### Updated JSON Body (with seed + img2img support):
```json
{
  "prompt": "{{$json.body.user_prompt}}",
  "width": 1024,
  "height": 576,
  "steps": 28,
  "seed": "{{$json.body.seed || 2892901615}}",
  "imageUrls": "={{$json.body.imageUrls || []}}"
}
```

**Note:** The updated prompt is simplified because the frontend now handles the "Architectural render" prefix in the angle prompts.

### Alternative: Use Expression Mode

If the above doesn't work, switch the JSON Body to **Expression mode** and use:

```javascript
={{
  const body = {
    "prompt": $json.body.user_prompt,
    "width": 1024,
    "height": 576,
    "steps": 28
  };
  
  if ($json.body.seed) {
    body.seed = $json.body.seed;
  }
  
  if ($json.body.imageUrls && Array.isArray($json.body.imageUrls) && $json.body.imageUrls.length > 0) {
    body.imageUrls = $json.body.imageUrls;
  }
  
  return body;
}}
```

5. **Save the workflow** in n8n

---

## Step 2: Enable Advanced Features in Frontend

After updating the n8n workflow, enable seed + img2img in the frontend:

1. Open `frontend/components/ConceptArchitect.tsx`
2. Find the line (around line 157):
   ```typescript
   const useAdvancedFeatures = false; // Set to true after updating n8n
   ```
3. Change it to:
   ```typescript
   const useAdvancedFeatures = true; // n8n workflow updated!
   ```
4. Save the file - Next.js will auto-reload

---

## Step 3: Test!

1. Go to your frontend app (should auto-reload)
2. Toggle to "4-Angle View"
3. Enter a simple prompt like: "minimalist beach villa"
4. Generate
5. You should see 4 coherent views of the SAME building! 🎉

---

## How it Works:

1. **Single Image Mode**: 
   - Frontend sends: `{ user_prompt: "...", seed: 123456 }`
   - n8n forwards seed to Krea AI
   
2. **Multi-Angle Mode - Exterior**:
   - Frontend sends: `{ user_prompt: "exterior view...", seed: 123456 }`
   - n8n generates exterior with seed
   
3. **Multi-Angle Mode - Other Angles**:
   - Frontend sends: `{ user_prompt: "interior view...", seed: 123456, imageUrls: ["https://...exterior.png"] }`
   - n8n uses exterior image as reference (img2img) with same seed
   - Result: Coherent building across all 4 angles!

---

## Troubleshooting

### If you see "Failed to generate exterior view" error:
- Make sure you've kept `useAdvancedFeatures = false` until n8n is updated
- The current error means n8n doesn't understand the new parameters yet
- Complete Step 1 (update n8n), then Step 2 (enable feature flag)

### If angles are still different buildings after enabling:
- Check n8n execution logs to verify seed + imageUrls are being passed
- Verify the workflow JSON Body includes the conditional seed/imageUrls logic
- Check browser console for errors during generation

### If img2img isn't working:
- The Flux model supports img2img via `imageUrls` parameter
- Make sure the exterior URL is publicly accessible
- Check that the URL starts with `https://`
- Wait 20-30 seconds for exterior to fully complete before other angles start
