export async function onRequestGet({ env }) {
  try {
    const kv = env.STEAM_ONLINE;
    if (!kv) return new Response(JSON.stringify({ online: 0 }), { headers: { "Content-Type": "application/json" } });

    const currentTime = Date.now();
    // Получаем текущий список активных сессий из базы
    let activeSessions = await kv.get("sessions");
    activeSessions = activeSessions ? JSON.parse(activeSessions) : {};

    // Очищаем тех, кто не заходил больше 2 минут (120000 мс)
    const newSessions = {};
    for (const [id, time] of Object.entries(activeSessions)) {
      if (currentTime - time < 120000) {
        newSessions[id] = time;
      }
    }

    // Добавляем текущего пользователя (генерируем случайный ID для этой сессии)
    newSessions[Math.random().toString(36).substring(7)] = currentTime;

    // Сохраняем обновленный список (живет 2 минуты)
    await kv.put("sessions", JSON.stringify(newSessions), { expirationTtl: 120 });

    const onlineCount = Object.keys(newSessions).length;

    return new Response(JSON.stringify({ online: onlineCount }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ online: 1 }), { headers: { "Content-Type": "application/json" } });
  }
}
