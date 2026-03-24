# n8n Workflow Update Instructions

## Enabling Seed + Image-to-Image for Multi-Angle Generation

To enable coherent multi-angle generation, update your n8n workflow to support `seed` and `imageUrls` parameters.

### Step-by-Step Instructions:

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

### How it Works:

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

### Test After Updating:

1. Save the workflow
2. Go to your frontend app
3. Toggle to "4-Angle View"
4. Generate a concept
5. You should see 4 coherent views of the SAME building!

---

## Troubleshooting

### If angles are still different buildings:
- Check n8n execution logs to verify seed + imageUrls are being passed
- Verify Krea API key has img2img permissions
- Try refreshing Docker container: `docker restart n8n`

### If img2img isn't working:
- The Flux model supports img2img via `imageUrls` parameter
- Make sure the exterior URL is publicly accessible
- Check that the URL starts with `https://`
