<script setup lang="ts">
const props = defineProps({
    modelValue: {
        type: Boolean,
        required: true,
    },
    peoples: {
        type: Array,
        default: () => [],
    },
    relationType: {
        type: String,
        default: '',
    },
});

const emit = defineEmits(['update:modelValue', 'accept', 'update:relationType']);

const close = () => emit('update:modelValue', false);
const accept = () => emit('accept');
</script>

<template>
    <atom-popup v-model="props.modelValue">
        <div class="relation-box">
            <div v-if="peoples.length === 3" class="relation-block relation-parent">
                <h4>Зв’язок між батьками і дитиною</h4>
                <div class="relation-content">
                    <p>
                        Від
                        <span class="person">{{ peoples[0].surname }} {{ peoples[0].name }}</span>
                        <span class="date">({{ peoples[0].birth_day }})</span>
                    </p>
                    <p>
                        і
                        <span class="person">{{ peoples[1].surname }} {{ peoples[1].name }}</span>
                        <span class="date">({{ peoples[1].birth_day }})</span>
                    </p>
                    <p>
                        прокласти батьківський зв’язок до
                        <span class="child">{{ peoples[2].surname }} {{ peoples[2].name }}</span>
                        <span class="date">({{ peoples[2].birth_day }})</span>
                    </p>
                </div>

                <div class="btn-group">
                    <button class="btn accept" @click="accept">Прийняти</button>
                    <button class="btn reject" @click="close">Відхилити</button>
                </div>
            </div>

            <div v-else-if="peoples.length === 2" class="relation-block relation-two">
                <h4>Виберіть тип зв’язку</h4>

                <div class="relation-selector">
                    <label>
                        <input
                            type="radio"
                            value="marriage"
                            v-model="props.relationType"
                            @change="emit('update:relationType', $event.target.value)"
                        />
                        Шлюбний зв’язок
                    </label>
                    <label>
                        <input
                            type="radio"
                            value="parent"
                            v-model="props.relationType"
                            @change="emit('update:relationType', $event.target.value)"
                        />
                        Батьківський зв’язок
                    </label>
                </div>

                <div v-if="relationType === 'marriage'" class="relation-content relation-marriage">
                    <p>
                        Від
                        <span class="person">{{ peoples[0].surname }} {{ peoples[0].name }}</span>
                        <span class="date">({{ peoples[0].birth_day }})</span>
                    </p>
                    <p>
                        до
                        <span class="person">{{ peoples[1].surname }} {{ peoples[1].name }}</span>
                        <span class="date">({{ peoples[1].birth_day }})</span>
                    </p>
                    <p>Створити шлюбний зв’язок між цими особами.</p>
                </div>

                <div v-else-if="relationType === 'parent'" class="relation-content relation-parent">
                    <p>
                        Від
                        <span class="person">{{ peoples[0].surname }} {{ peoples[0].name }}</span>
                        <span class="date">({{ peoples[0].birth_day }})</span>
                    </p>
                    <p>
                        до
                        <span class="child">{{ peoples[1].surname }} {{ peoples[1].name }}</span>
                        <span class="date">({{ peoples[1].birth_day }})</span>
                    </p>
                    <p>Створити батьківський зв’язок між цими особами.</p>
                </div>

                <div class="btn-group">
                    <button class="btn accept" :disabled="!relationType" @click="accept">Прийняти</button>
                    <button class="btn reject" @click="close">Відхилити</button>
                </div>
            </div>

            <div v-else-if="peoples.length > 3" class="relation-message warning">
                <p>Забагато обраних людей</p>
                <div class="btn-group">
                    <button class="btn reject" @click="close">Відхилити</button>
                </div>
            </div>

            <div v-else class="relation-message hint">
                <p>Виберіть людей, щоб створити зв’язок</p>
                <div class="btn-group">
                    <button class="btn reject" @click="close">Відхилити</button>
                </div>
            </div>
        </div>
    </atom-popup>
</template>

<style lang="scss">
.relation {
    &-box {
        background: #f8f9fa;
        border: 1px solid #ddd;
        border-radius: 12px;
        padding: 16px 20px;
        font-family: 'Segoe UI', sans-serif;
        color: #333;
        max-width: 520px;
        line-height: 1.5;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
    }
    &-block {
        border-left: 4px solid #a0a0a0;
        padding-left: 12px;
        margin-bottom: 8px;
    }
    &-parent {
        border-left-color: #4a90e2;
    }
    &-marriage {
        border-left-color: #d36ba4;
    }
    &-two h4 {
        margin-bottom: 10px;
    }
    &-selector {
        display: flex;
        gap: 20px;
        margin-bottom: 10px;
    }
    &-selector label {
        font-size: 0.95em;
        cursor: pointer;
        user-select: none;
    }
    &-selector input[type='radio'] {
        margin-right: 6px;
    }
    &-content p {
        margin: 5px 0;
    }
    &-message {
        text-align: center;
        padding: 10px;
        font-size: 0.95em;
        border-radius: 8px;
    }
    &-message.warning {
        background: #ffe5e5;
        color: #b80000;
        border: 1px solid #f3c2c2;
    }
    &-message.hint {
        background: #f2f5f8;
        color: #555;
        border: 1px dashed #ccc;
    }
}
.child {
    font-weight: 600;
    color: #2c8d46;
}
.date {
    color: #777;
    font-size: 0.9em;
    margin-left: 4px;
}
</style>
