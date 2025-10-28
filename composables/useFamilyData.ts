export function useFamilyData(trees_id: number) {
    const config = useRuntimeConfig();

    const { data: peoples } = useAsyncData(
        'peoples-'+trees_id,
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
        peoples.value.forEach((person) => {
            if (!Array.isArray(person.relations)) return;
            person.relations.forEach((r) => result.push({ from: person.id, to: r.id, type: r.type }));
        });
        return result;
    });

    return { peoples, relations };
}
