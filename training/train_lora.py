import argparse
import json
import os
from pathlib import Path

import torch
from datasets import Dataset
from peft import LoraConfig, TaskType, get_peft_model
from transformers import (AutoModelForCausalLM, AutoTokenizer, DataCollatorForLanguageModeling,
                          Trainer, TrainingArguments)

DEFAULT_MODEL = "Qwen/Qwen2.5-0.5B-Instruct"


def load_rows(path: Path):
    rows = []
    with path.open("r", encoding="utf-8") as stream:
        for number, line in enumerate(stream, 1):
            if not line.strip():
                continue
            item = json.loads(line)
            instruction = str(item.get("instruction", "")).strip()
            output = str(item.get("output", "")).strip()
            user_input = str(item.get("input", "")).strip()
            if not instruction or not output:
                raise ValueError(f"Line {number}: instruction and output are required")
            prompt = "### Ko‘rsatma\n" + instruction
            if user_input:
                prompt += "\n### Kirish\n" + user_input
            text = prompt + "\n### Javob\n" + output
            rows.append({"text": text})
    if len(rows) < 50:
        raise ValueError("At least 50 reviewed examples are required; 1,000+ diverse examples are recommended.")
    return rows


def main():
    parser = argparse.ArgumentParser(description="LoRA fine-tuning starter for a separate Uzbek-first adapter.")
    parser.add_argument("--data", default="training/data/uzbek-instructions.jsonl")
    parser.add_argument("--model", default=os.getenv("BASE_MODEL", DEFAULT_MODEL))
    parser.add_argument("--output", default="training/output/uzbek-lora")
    parser.add_argument("--epochs", type=float, default=2.0)
    parser.add_argument("--max-length", type=int, default=1024)
    args = parser.parse_args()

    rows = load_rows(Path(args.data))
    dataset = Dataset.from_list(rows).train_test_split(test_size=0.05, seed=42)
    tokenizer = AutoTokenizer.from_pretrained(args.model, use_fast=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    model = AutoModelForCausalLM.from_pretrained(
        args.model, torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32
    )
    model.config.use_cache = False
    model.gradient_checkpointing_enable()
    lora = LoraConfig(
        task_type=TaskType.CAUSAL_LM, r=8, lora_alpha=16, lora_dropout=0.05,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
        bias="none"
    )
    model = get_peft_model(model, lora)
    model.print_trainable_parameters()

    def tokenize(batch):
        encoded = tokenizer(batch["text"], truncation=True, max_length=args.max_length)
        encoded["labels"] = [ids.copy() for ids in encoded["input_ids"]]
        return encoded

    tokenized = dataset.map(tokenize, batched=True, remove_columns=["text"])
    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)
    training = TrainingArguments(
        output_dir=str(output), num_train_epochs=args.epochs,
        per_device_train_batch_size=1, per_device_eval_batch_size=1,
        gradient_accumulation_steps=8, learning_rate=2e-4, warmup_ratio=0.05,
        logging_steps=10, eval_strategy="epoch", save_strategy="epoch",
        save_total_limit=2, fp16=torch.cuda.is_available(), bf16=False,
        gradient_checkpointing=True, report_to="none",
        load_best_model_at_end=True, metric_for_best_model="eval_loss",
        greater_is_better=False
    )
    trainer = Trainer(model=model, args=training,
        train_dataset=tokenized["train"], eval_dataset=tokenized["test"],
        data_collator=DataCollatorForLanguageModeling(tokenizer=tokenizer, mlm=False))
    trainer.train()
    trainer.save_model(str(output / "adapter"))
    tokenizer.save_pretrained(str(output / "adapter"))
    (output / "training-manifest.json").write_text(json.dumps({
        "base_model": args.model, "adapter": "LoRA", "dataset_rows": len(rows),
        "epochs": args.epochs, "max_length": args.max_length,
        "hardware": "cuda" if torch.cuda.is_available() else "cpu",
        "note": "Adapter only; base model weights are not replaced. Evaluate before deployment."
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    print("Adapter saved:", output / "adapter")


if __name__ == "__main__":
    main()
