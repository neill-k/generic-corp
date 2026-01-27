-- Cloudflare Workers rate limiting script
-- Advanced rate limiting for demo.genericcorp.com

local RATE_LIMIT = {
    requests_per_minute = 100,
    burst = 20,
    block_duration = 300  -- 5 minutes
}

-- Track request counts in KV store
local function get_request_count(ip)
    local key = "rate_limit:" .. ip
    local count = kv.get(key)
    return tonumber(count) or 0
end

local function increment_request_count(ip)
    local key = "rate_limit:" .. ip
    local count = get_request_count(ip)
    kv.set(key, count + 1, {expirationTtl = 60})
    return count + 1
end

-- Check if IP is blocked
local function is_blocked(ip)
    local key = "blocked:" .. ip
    return kv.get(key) ~= nil
end

-- Block IP
local function block_ip(ip)
    local key = "blocked:" .. ip
    kv.set(key, "1", {expirationTtl = RATE_LIMIT.block_duration})
end

-- Main handler
function handle_request(request)
    local ip = request.headers["cf-connecting-ip"]

    -- Check if already blocked
    if is_blocked(ip) then
        return {
            status = 429,
            body = "Rate limit exceeded. Try again later.",
            headers = {
                ["Retry-After"] = tostring(RATE_LIMIT.block_duration)
            }
        }
    end

    -- Increment and check rate limit
    local count = increment_request_count(ip)

    if count > RATE_LIMIT.requests_per_minute then
        block_ip(ip)
        return {
            status = 429,
            body = "Rate limit exceeded. Blocked for " .. RATE_LIMIT.block_duration .. " seconds.",
            headers = {
                ["Retry-After"] = tostring(RATE_LIMIT.block_duration)
            }
        }
    end

    -- Add rate limit headers
    request.headers["X-RateLimit-Limit"] = tostring(RATE_LIMIT.requests_per_minute)
    request.headers["X-RateLimit-Remaining"] = tostring(RATE_LIMIT.requests_per_minute - count)

    return request
end
