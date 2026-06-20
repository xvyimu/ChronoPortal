-- =============================================
-- 公益API导航站 - 生产库完整迁移
-- 在 https://supabase.com/dashboard/project/vyqqbypwrbdcafanzwmj/sql/new 执行
-- =============================================

-- 先清空旧数据（从头迁移）
DELETE FROM nav_links;
DELETE FROM nav_categories;

-- ==================== 分类 ====================
INSERT INTO nav_categories (id, name, slug, description, icon, sort_order) VALUES
  ('c0000000-0000-0000-0000-000000000001', '公益中转站',  'free-relay', '免费公益 API 中转服务，无需付费即可使用', '🆓', 1),
  ('c0000000-0000-0000-0000-000000000002', '大厂API',     'big-tech',   '各大厂商提供的 API 服务',              '🏢', 2),
  ('c0000000-0000-0000-0000-000000000003', '开源模型',    'oss-model',  '开源的 AI 模型与工具',               '📖', 3),
  ('c0000000-0000-0000-0000-000000000004', '算力GPU',     'gpu',        'GPU 算力租赁与服务',                  '⚡', 4);

-- ==================== 公益中转站 ====================
INSERT INTO nav_links (title, url, description, icon, category_id, approved, featured) VALUES
  ('DeepSeek 官方',       'https://chat.deepseek.com/',        '深度求索，国产开源大模型代表', '🤖', 'c0000000-0000-0000-0000-000000000001', true, true),
  ('硅基流动',           'https://cloud.siliconflow.cn/',     'SiliconFlow 云端推理',        '☁️', 'c0000000-0000-0000-0000-000000000001', true, true),
  ('Groq',               'https://groq.com/',                 'Groq LPU 超低延迟推理',        '⚡', 'c0000000-0000-0000-0000-000000000001', true, true),
  ('Cloudflare Workers AI','https://ai.cloudflare.com/',      'CF Workers AI 免费额度',       '🌐', 'c0000000-0000-0000-0000-000000000001', true, true),
  ('Hugging Face',       'https://huggingface.co/',           '最流行的模型托管平台',          '🤗', 'c0000000-0000-0000-0000-000000000001', true, true),
  ('OpenRouter',         'https://openrouter.ai/',            '统一API网关，聚合多模型',       '🔀', 'c0000000-0000-0000-0000-000000000001', true, true),
  ('Google Gemini',      'https://aistudio.google.com/',      'Google AI Studio 免费使用',     '🔮', 'c0000000-0000-0000-0000-000000000001', true, true),
  ('Anthropic Console',  'https://console.anthropic.com/',    'Claude 官方控制台',            '🟣', 'c0000000-0000-0000-0000-000000000001', true, false),
  ('Cohere',             'https://dashboard.cohere.com/',     'Cohere 企业级 NLP API',        '🧠', 'c0000000-0000-0000-0000-000000000001', true, false),
  ('Perplexity',         'https://www.perplexity.ai/',        'AI 搜索引擎',                  '🔍', 'c0000000-0000-0000-0000-000000000001', true, false),
  ('DeepInfra',          'https://deepinfra.com/',            '开源模型推理 API',              '⚙️', 'c0000000-0000-0000-0000-000000000001', true, true),
  ('Together AI',        'https://www.together.ai/',          '去中心化 AI 推理网络',          '🔗', 'c0000000-0000-0000-0000-000000000001', true, false),
  ('Fireworks AI',       'https://fireworks.ai/',             '快速推理平台',                 '🎆', 'c0000000-0000-0000-0000-000000000001', true, false),
  ('Mistral AI',         'https://console.mistral.ai/',       'Mistral 模型官方 API',         '💧', 'c0000000-0000-0000-0000-000000000001', true, true),
  ('AI/ML API',          'https://aimlapi.com/',              'AI/ML API 聚合平台',           '🧩', 'c0000000-0000-0000-0000-000000000001', true, false),
  ('NovaAI',             'https://novaai.app/',               'NovaAI 多模型 API',            '✨', 'c0000000-0000-0000-0000-000000000001', true, true),
  ('Freeai.one',         'https://freeai.one/',               '免费AI API 聚合',             '🆓', 'c0000000-0000-0000-0000-000000000001', true, true),
  ('Zeabur AI',          'https://zeabur.com/ai',             'Zeabur 一键部署 AI 服务',      '🚀', 'c0000000-0000-0000-0000-000000000001', true, false);

-- ==================== 大厂API ====================
INSERT INTO nav_links (title, url, description, icon, category_id, approved, featured) VALUES
  ('OpenAI API',         'https://platform.openai.com/',      'OpenAI GPT-4o / o3 API',              '🟢', 'c0000000-0000-0000-0000-000000000002', true, true),
  ('Google AI',          'https://ai.google.dev/',            'Gemini API & Vertex AI',               '🔴', 'c0000000-0000-0000-0000-000000000002', true, true),
  ('Anthropic API',      'https://docs.anthropic.com/',       'Claude 系列模型 API',                  '🟣', 'c0000000-0000-0000-0000-000000000002', true, true),
  ('Meta AI',            'https://ai.meta.com/',              'Meta Llama 开源大模型',                '🔵', 'c0000000-0000-0000-0000-000000000002', true, true),
  ('百度千帆',           'https://cloud.baidu.com/product/wenxinworkshop', '百度文心大模型 API',     '🇨🇳', 'c0000000-0000-0000-0000-000000000002', true, true),
  ('阿里通义千问',       'https://tongyi.aliyun.com/',        '阿里通义大模型 API',                   '🇨🇳', 'c0000000-0000-0000-0000-000000000002', true, true),
  ('腾讯混元',           'https://cloud.tencent.com/product/hunyuan', '腾讯混元大模型 API',            '🇨🇳', 'c0000000-0000-0000-0000-000000000002', true, false),
  ('字节豆包',           'https://www.volcengine.com/product/doubao', '字节跳动豆包大模型 API',          '🇨🇳', 'c0000000-0000-0000-0000-000000000002', true, false),
  ('微软 Azure OpenAI',  'https://azure.microsoft.com/products/ai-services/', 'Azure AI 服务',          '🟦', 'c0000000-0000-0000-0000-000000000002', true, true);

-- ==================== 开源模型 ====================
INSERT INTO nav_links (title, url, description, icon, category_id, approved, featured) VALUES
  ('Ollama',             'https://ollama.com/',               '本地运行开源大模型',                    '🦙', 'c0000000-0000-0000-0000-000000000003', true, true),
  ('vLLM',               'https://github.com/vllm-project/vllm', '高性能推理引擎',                  '⚡', 'c0000000-0000-0000-0000-000000000003', true, true),
  ('Llama.cpp',          'https://github.com/ggml-ai/llama.cpp', 'C/C++ 模型推理框架',              '🖥️', 'c0000000-0000-0000-0000-000000000003', true, true);

-- ==================== 算力GPU ====================
INSERT INTO nav_links (title, url, description, icon, category_id, approved, featured) VALUES
  ('AutoDL',             'https://www.autodl.com/',           'AutoDL 算力云（国内方便）',            '💰', 'c0000000-0000-0000-0000-000000000004', true, true),
  ('Vast.ai',            'https://vast.ai/',                  'Vast.ai 全球 GPU 租赁',               '🌍', 'c0000000-0000-0000-0000-000000000004', true, true),
  ('RunPod',             'https://runpod.io/',                'RunPod GPU 云',                        '🎮', 'c0000000-0000-0000-0000-000000000004', true, true),
  ('Lambda Labs',        'https://lambdalabs.com/',           'Lambda GPU Cloud',                     '🖥️', 'c0000000-0000-0000-0000-000000000004', true, false),
  ('Massed Compute',     'https://massedcompute.com/',        'Massed Compute GPU 租赁',              '💻', 'c0000000-0000-0000-0000-000000000004', true, false);

-- ==================== RLS 权限 ====================
-- 管理员操作权限（使用 anon key 即可增删改）
CREATE POLICY "Anon update links" ON nav_links FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anon delete links" ON nav_links FOR DELETE USING (true);
CREATE POLICY "Anon insert categories" ON nav_categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Anon update categories" ON nav_categories FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anon delete categories" ON nav_categories FOR DELETE USING (true);

-- ==================== 索引 ====================
CREATE INDEX IF NOT EXISTS idx_links_category ON nav_links(category_id);
CREATE INDEX IF NOT EXISTS idx_links_approved ON nav_links(approved);
CREATE INDEX IF NOT EXISTS idx_links_featured ON nav_links(featured);
CREATE INDEX IF NOT EXISTS idx_links_url ON nav_links(url);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON nav_categories(slug);
