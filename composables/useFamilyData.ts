export function useFamilyData(trees_id: number) {
    const config = useRuntimeConfig();

    const { data: peoples, refresh: peoplesRefresh } = useAsyncData(
        'peoples-' + trees_id,
        async () => {
            const response = await $fetch('api/peoples', {
                baseURL: process.server ? config.public.API_BASE_URL : '',
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: {
                    jsonrpc: '2.0',
                    method: 'default',
                    params: {
                        trees_id: trees_id,
                    },
                },
            });
            return response[0].result;
        },
        { default: () => [] }
    );

    const relations = computed(() => {
        const result: { from: number; to: number; type: string }[] = [];

        // РЯДОК 26 (приблизно): ВИПРАВЛЕННЯ ПОМИЛКИ TypeError
        // Додано захист: перевіряємо, чи peoples.value не є null/undefined
        if (!peoples.value) {
            return result;
        }

        // Тепер можна безпечно викликати forEach, оскільки по замовчуванню це []
        peoples.value.forEach((person) => {
            // Перевіряємо, чи person.relations є масивом
            if (!Array.isArray(person.relations)) return;

            // Якщо person.id не визначений, пропускаємо
            if (!person.id) return;

            person.relations.forEach((r) =>
                // Перевіряємо, чи має зв'язок необхідні поля
                r.id && r.type && result.push({ from: person.id, to: r.id, type: r.type })
            );
        });

        return result;
    });

    return { peoples, relations, peoplesRefresh };
}
