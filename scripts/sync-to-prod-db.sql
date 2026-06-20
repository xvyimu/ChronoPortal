-- ============================================
-- 公益API导航站 - 新库数据同步
-- 目标项目: vyqqbypwrbdcafanzwmj
-- 在 Supabase Dashboard → SQL Editor 中执行
-- ============================================

-- 1. 清空旧数据
TRUNCATE nav_links CASCADE;
TRUNCATE nav_categories CASCADE;

-- 2. 重建分类
INSERT INTO nav_categories (id, name, slug, description, icon, sort_order) VALUES
  ('a0000001-0001-4000-8000-000000000001', '公益中转站', 'free-relay', '免费/公益AI API 中转站，注册即送额度', '🆓', 1),
  ('a0000001-0002-4000-8000-000000000002', '大厂API', 'big-tech', '各大厂商官方 AI API 平台', '🏢', 2),
  ('a0000001-0003-4000-8000-000000000003', '开源模型', 'oss-model', '开源大模型 API 服务', '📖', 3),
  ('a0000001-0004-4000-8000-000000000004', '算力GPU', 'gpu', 'GPU 算力租赁与云服务', '⚡', 4);

-- 3. 公益中转站数据
INSERT INTO nav_links (title, url, description, icon, category_id, approved, featured) VALUES
  ('维云', 'https://vslm.com/register?aff=2Lhp', '大站，签到送额度，模型丰富Claude/GPT/Gemini，速度极快', '☁️', 'a0000001-0001-4000-8000-000000000001', true, true),
  ('Sk-Free', 'https://www.sk-free.com/sign-up?aff=NBY8', '注册送30刀，模型倍率0.1，GPT5.2-5.5/Claude全系，速度5s内', '⭐', 'a0000001-0001-4000-8000-000000000001', true, true),
  ('Future Hub', 'https://api.futureppo.top/register?aff=70Ry', '纯公益站，注册送10刀签到得10-20刀，国模免费，需GitHub/edu邮箱', '🔮', 'a0000001-0001-4000-8000-000000000001', true, true),
  ('登仙API', 'https://api.denxio.top/register?invite_code=E7PJRQKS4K6S', '纯公益站，注册送10仙缘，签到0.5-1仙缘，经常搞活动', '🐉', 'a0000001-0001-4000-8000-000000000001', true, true),
  ('Moyuu AI', 'http://moyuu.cc/register?aff=Sswo', '公益站，注册送6刀签到也送，Claude/GPT/Gemini模型丰富', '🌈', 'a0000001-0001-4000-8000-000000000001', true, true),
  ('君の的公益', 'https://muyuan.do/register?aff=a5Es', 'Claude/GPT全系，每日签到送50-500额度，需LinuxDO登录', '🎯', 'a0000001-0001-4000-8000-000000000001', true, true),
  ('52模型', 'https://52mx.net/sign-up?aff=Jt7y', '注册送10刀签到也得，国模免费，充值1:2，建议充1元保号', '🔢', 'a0000001-0001-4000-8000-000000000001', true, false),
  ('量大管饱', 'https://www.ldgb.top/register?aff=UA2D8467TR7Y', '注册送1刀，充值是1:2，首字2s内，GPT模型为主', '🍚', 'a0000001-0001-4000-8000-000000000001', true, false),
  ('二狗子', 'https://ergouzi.life/register?aff=hc03', '注册送0.15，倍率极低0.01-0.03，模型丰富Claude/GPT/DeepSeek等', '🐕', 'a0000001-0001-4000-8000-000000000001', true, false),
  ('Bluesminds', 'https://api.bluesminds.com/register?aff=yyIO', '新站，注册就送100刀！模型有Claude/GPT/Kimi/DeepSeek等', '💙', 'a0000001-0001-4000-8000-000000000001', true, true),
  ('CaMeL AI', 'https://camel.kr777.top/register?aff=ZxU0', '注册送3刀，教育邮箱每日2刀福利，GPT/Claude/Gemini', '🐫', 'a0000001-0001-4000-8000-000000000001', true, false),
  ('VC API', 'https://sub.vcnovb.cn/register?aff=ZBAL257RV3LF', '新站，注册送5刀，邀请1人再送5刀，模型丰富', '💎', 'a0000001-0001-4000-8000-000000000001', true, false),
  ('猎豹API', 'https://44ai.vip/register?aff=HC86PZWV2R3JA', '每日20刀/周100刀/月400刀，注册送15天月卡，GPT模型', '🐆', 'a0000001-0001-4000-8000-000000000001', true, false),
  ('斑马API', 'https://bmap.020212.xyz/register?aff=AUXW8W96MWSJ', '注册送Pro月卡=4000积分约60刀，拉新可叠加，GPT为主速度快', '🦓', 'a0000001-0001-4000-8000-000000000001', true, false),
  ('GJX AI', 'https://api.gjx88.com/register?aff=EWJ4LWSMMYCR', '注册送50刀，GPT5.2-5.5/image-2，文本/生图渠道分离', '🤖', 'a0000001-0001-4000-8000-000000000001', true, false),
  ('Model Gate', 'https://modelgate.app/register?aff=iRNj', '注册送5刀，每天签到1-5刀，纯Claude号池', '🚪', 'a0000001-0001-4000-8000-000000000001', true, false),
  ('Ai-Router', 'https://ai-router.dev/register?aff=G558N3PZ823Q', '注册即得20刀，GPT5.2-5.5全覆盖，无签到', '🔀', 'a0000001-0001-4000-8000-000000000001', true, false),
  ('芙卡卡の小食堂', 'https://api.fuka.win/register?aff=lPF0', '注册得150点按次付费，Claude/GPT/Gemini/DeepSeek/智谱等', '🍽️', 'a0000001-0001-4000-8000-000000000001', true, false),
  ('可萌中转站', 'https://api456.me/register?aff=Bccj', '注册送20硬币按次扣费，Claude/GPT/Gemini/DeepSeek/Kimi等', '🐱', 'a0000001-0001-4000-8000-000000000001', true, false),
  ('云舟API', 'https://cli.999554.xyz/register?aff=nVjt', 'DeepSeek V4 flash长期免费，其他付费codex常0.05倍率', '🚢', 'a0000001-0001-4000-8000-000000000001', true, false),
  ('FreeModel', 'https://freemodel.dev/invite/FRE-20d20d49', '注册送一个月Pro，每5小时10刀/周66.67刀，需绑定手机', '🎁', 'a0000001-0001-4000-8000-000000000001', true, false),
  ('FreeTokenNav', 'https://qm.qq.com/q/h7ImuW5uve', '加群一起讨论AI讨论Token！QQ群：5735665', '📢', 'a0000001-0001-4000-8000-000000000001', true, false);

-- 4. 大厂API
INSERT INTO nav_links (title, url, description, icon, category_id, approved, featured) VALUES
  ('阿里云百炼', 'https://bailian.console.aliyun.com', '阿里云大模型服务平台，通义千问系列', '☁️', 'a0000001-0002-4000-8000-000000000002', true, true),
  ('火山引擎', 'https://volcengine.com', '字节跳动大模型API平台，豆包系列模型', '🌋', 'a0000001-0002-4000-8000-000000000002', true, true),
  ('智谱AI', 'https://open.bigmodel.cn', '智谱AI开放平台，GLM系列模型', '🧠', 'a0000001-0002-4000-8000-000000000002', true, true),
  ('硅基流动', 'https://siliconflow.cn', '硅基流动大模型API平台', '💧', 'a0000001-0002-4000-8000-000000000002', true, true),
  ('商汤日日新', 'https://www.sensetime.com', '商汤科技大模型平台SenseNova', '🏪', 'a0000001-0002-4000-8000-000000000002', true, false),
  ('OpenRouter', 'https://openrouter.ai', '多模型聚合API平台，支持多种大模型', '🔀', 'a0000001-0002-4000-8000-000000000002', true, true),
  ('Cloudflare Workers AI', 'https://developers.cloudflare.com/workers-ai', 'Cloudflare边缘AI推理', '🌐', 'a0000001-0002-4000-8000-000000000002', true, false),
  ('NVIDIA NIM', 'https://build.nvidia.com', 'NVIDIA GPU加速AI推理API', '🎮', 'a0000001-0002-4000-8000-000000000002', true, false),
  ('Xiaomi MiMo', 'https://mimo.xiaomi.com', '小米MiMo开放平台', '📱', 'a0000001-0002-4000-8000-000000000002', true, false);

-- 5. 索引
CREATE INDEX IF NOT EXISTS idx_nav_links_category ON nav_links(category_id);
CREATE INDEX IF NOT EXISTS idx_nav_links_approved ON nav_links(approved);
CREATE INDEX IF NOT EXISTS idx_nav_links_featured_paid ON nav_links(featured DESC, paid DESC, created_at DESC);