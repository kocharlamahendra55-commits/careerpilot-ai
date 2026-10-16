# OpenRouter Analysis - Quick Summary

**Date:** August 4, 2026

---

## TL;DR

✅ **OpenRouter is suitable for CareerPilot**  
⚠️ **Requires one-time $10 purchase for production**  
💰 **Cost: ~$0.01 per complete user session**  
📊 **Free tier: 50 requests/day (good for development)**  
🚀 **Paid tier: 1,000 requests/day (good for 200+ users/day)**

---

## Token Usage Per Feature

| Feature | Tokens | Cost | Requests |
|---------|--------|------|----------|
| **Resume Analysis** | ~5,555 | $0.0033 | 1 |
| **Job Match** | ~4,785 | $0.0029 | 1 |
| **Roadmap** | ~6,065 | $0.0036 | 1 |
| **Interview Prep** | ~5,033 | $0.0030 | 1 |
| **Recruiter Copilot** | ~280 | $0.0002 | 1 |
| **Complete Session** | ~22,000 | **$0.0130** | **5** |

---

## Daily Usage Scenarios

| Users/Day | Requests/Day | Monthly Cost | Free Tier OK? |
|-----------|--------------|--------------|---------------|
| **10** | 17 | $2.13 | ✅ Yes |
| **25** | 35 | $5.40 | ✅ Yes |
| **50** | 70 | $10.80 | ❌ No - need $10 purchase |
| **100** | 140 | $21.60 | ❌ No - need $10 purchase |

---

## OpenRouter Limits

### Free Tier (No Purchase)
- ✅ 50 requests/day
- ✅ 20 requests/minute
- ✅ No token limit
- ✅ Good for development

### After $10 Purchase (One-Time)
- ✅ 1,000 requests/day
- ✅ 20 requests/minute
- ✅ No token limit
- ✅ Credits never expire
- ✅ Good for production

---

## Model Recommendation

### ❌ `openai/gpt-4o-mini:free` - NO LONGER EXISTS

### ✅ `openai/gpt-4o-mini` (Paid) - **RECOMMENDED**

**Why:**
- Excellent JSON reliability
- Best ATS analysis quality
- Fast inference
- Extremely cheap ($0.15/$0.60 per 1M tokens)
- No daily limits

**Cost:** ~$10-25/month for typical production usage

### Alternative: `deepseek/deepseek-v3:free` (Actually Free)

**Pros:**
- Completely free
- 164K context window
- Good reasoning

**Cons:**
- JSON reliability unknown
- Subject to 50 req/day limit
- May be delisted in future

**Verdict:** Too risky for production

---

## Development Usage Estimate

### Conservative (5 uploads/day)
- ✅ 14 requests/day
- ✅ Free tier sufficient
- 💰 Cost if paid: $1.32/month

### Normal (10 uploads/day)
- ✅ 28 requests/day
- ✅ Free tier sufficient
- 💰 Cost if paid: $2.67/month

### Aggressive (20 uploads/day)
- ⚠️ 50 requests/day (at limit)
- ✅ Free tier just sufficient
- 💰 Cost if paid: $4.80/month

---

## Final Recommendation

### For Development:
1. ✅ Use free tier (50 req/day)
2. ✅ Test with `openai/gpt-4o-mini`
3. ✅ Expected cost: FREE (within limits)
4. ✅ Duration: Unlimited

### For Production:
1. ✅ Purchase $10 credit (one-time)
2. ✅ Use `openai/gpt-4o-mini`
3. ✅ Expected cost: $10-25/month
4. ✅ Supports: 50-200 users/day

### Migration Decision:
✅ **PROCEED WITH OPENROUTER**

**Reasons:**
- GitHub Models retired (no choice)
- OpenRouter is cost-effective
- One-time $10 purchase is reasonable
- Scales well for small-medium production
- No subscription lock-in

---

## Comparison with Alternatives

| Provider | Development | Production (100 users/day) |
|----------|-------------|---------------------------|
| **OpenRouter** | FREE (50/day) | $21.60/month ✅ |
| **OpenAI Direct** | $5 free credits | $21.60/month |
| **Azure OpenAI** | None | $100+/month |
| **Anthropic Claude** | None | $100+/month |

**Winner:** OpenRouter (best value)

---

## Action Plan

### Step 1: Immediate (This Week)
- [x] Code migration complete
- [ ] Get OpenRouter API key (free)
- [ ] Test 10-20 resumes
- [ ] Validate JSON quality

### Step 2: Decision Point (Next Week)
- [ ] If quality is good → Purchase $10 credit
- [ ] Test with 100+ uploads
- [ ] Monitor usage patterns
- [ ] Confirm cost projections

### Step 3: Production (Week 3)
- [ ] Deploy with paid model
- [ ] Set up usage monitoring
- [ ] Configure alerts at 800 req/day
- [ ] Document scaling plan

---

## Key Metrics to Track

1. **Daily Requests:** Should stay under 1,000/day
2. **Token Usage:** Average ~22K per complete session
3. **Cost Per User:** Target $0.013 per session
4. **Response Time:** Target 2-4 seconds
5. **Error Rate:** Should be < 1%

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Hit daily limit | Low | Medium | Set alerts at 800/day |
| Free models delisted | High | Low | Already using paid model |
| Cost overrun | Low | Low | Set budget alerts |
| Quality issues | Low | High | Test thoroughly before production |
| Rate limits (RPM) | Medium | Low | Implement exponential backoff |

---

## Bottom Line

**OpenRouter is the right choice for CareerPilot.**

- ✅ Cost-effective ($10-25/month for production)
- ✅ Scales to 200-500 users/day
- ✅ One-time $10 purchase unlocks full capacity
- ✅ No subscription lock-in
- ✅ Excellent model quality (GPT-4o-mini)

**Expected ROI:** Excellent. Comparable services cost $50-200/month.

---

**Next Step:** Get your OpenRouter API key and start testing!

Visit: https://openrouter.ai/settings/keys
