import os
import django
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification, Trainer, TrainingArguments
from datasets import Dataset
import numpy as np

# Configurar Django para acceder a MongoDB
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.analysis.models import DatoEntrenamiento

def entrenar_modelo():
    print("--- INICIANDO ENTRENAMIENTO DE SCAMMER-TEXT-V1 ---")
    
    # 1. Cargar datos de MongoDB
    datos = DatoEntrenamiento.objects()
    if datos.count() < 10:
        print("ERROR: Pocos datos para entrenar. Ejecuta el seeder primero.")
        return

    textos = [d.contenido for d in datos]
    etiquetas = [d.etiqueta for d in datos]

    # 2. Preparar Dataset
    dataset = Dataset.from_dict({"text": textos, "label": etiquetas})
    dataset = dataset.train_test_split(test_size=0.2)

    # Cambio a modelo MULTILINGÜE para soportar Español
    model_name = "distilbert-base-multilingual-cased"
    tokenizer = AutoTokenizer.from_pretrained(model_name)

    def tokenize_function(examples):
        return tokenizer(examples["text"], padding="max_length", truncation=True, max_length=512)

    tokenized_datasets = dataset.map(tokenize_function, batched=True)

    # 3. Cargar Modelo para Clasificación (2 clases: Humano/IA)
    model = AutoModelForSequenceClassification.from_pretrained(model_name, num_labels=2)

    # 4. Configurar Entrenamiento
    training_args = TrainingArguments(
        output_dir="./models/text_detector/temp_checkpoints",
        eval_strategy="epoch",
        learning_rate=2e-5,
        per_device_train_batch_size=8,
        num_train_epochs=5,
        weight_decay=0.01,
        save_strategy="no"
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_datasets["train"],
        eval_dataset=tokenized_datasets["test"],
    )

    # 5. Entrenar y Guardar
    trainer.train()
    
    model_path = "./models/text_detector/final_model"
    model.save_pretrained(model_path)
    tokenizer.save_pretrained(model_path)
    print(f"--- MODELO GUARDADO EXITOSAMENTE EN {model_path} ---")

if __name__ == "__main__":
    entrenar_modelo()
