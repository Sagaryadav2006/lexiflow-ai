from presidio_analyzer import AnalyzerEngine
from presidio_analyzer.nlp_engine import NlpEngineProvider
import re

# 1. Force Presidio to use the lightweight 12MB model instead of the 400MB default
configuration = {
    "nlp_engine_name": "spacy",
    "models": [{"lang_code": "en", "model_name": "en_core_web_sm"}],
}
provider = NlpEngineProvider(nlp_configuration=configuration)
nlp_engine = provider.create_engine()

# 2. Initialize the analyzer engine once with the configured NLP engine
analyzer = AnalyzerEngine(nlp_engine=nlp_engine, supported_languages=["en"])

# The specific entities we care about (MONEY excluded so contract dollar values remain visible for financial risk calculation)
ENTITIES_TO_MASK = [
    "PERSON",
    "ORGANIZATION",
    "LOCATION",
    "EMAIL_ADDRESS",
    "PHONE_NUMBER",
    "DATE_TIME"
]

def mask_pii(text: str) -> tuple[str, dict]:
    """
    Masks PII in the given text using Presidio + deterministic regex layers.
    Returns the masked text and a mapping dictionary for deanonymization.
    """
    results = analyzer.analyze(text=text, entities=ENTITIES_TO_MASK, language='en')

    # Pass 1: Assign tokens left-to-right
    results.sort(key=lambda x: x.start, reverse=False)

    mapping = {}
    counters = {ent: 1 for ent in ENTITIES_TO_MASK}
    counters.update({"COMPANY": 1, "ADDRESS": 1, "ZIP_CODE": 1, "STATE": 1})
    seen_texts = {}

    result_tokens = []

    skip_phrases = {
        "the company", "company", '"company"',
        "the commission", "commission", "consultant", "the consultant",
        "contractor", "the contractor", "agreement"
    }

    for result in results:
        original_text = text[result.start:result.end].strip()
        if original_text.lower() in skip_phrases or re.search(r'<[A-Z_]+_\d+>', original_text):
            continue
        # Do not let Presidio mask numbered section headers
        if re.match(r'^\d+[\.\)]', original_text):
            continue

        entity_type = result.entity_type
        seen_key = (entity_type, original_text)
        if seen_key in seen_texts:
            token = seen_texts[seen_key]
        else:
            token = f"<{entity_type}_{counters[entity_type]}>"
            seen_texts[seen_key] = token
            counters[entity_type] += 1
            mapping[token] = original_text

        result_tokens.append((result, token))

    # Pass 2: Replace tokens right-to-left to safely modify the string
    result_tokens.sort(key=lambda x: x[0].start, reverse=True)
    masked_text = text

    for result, token in result_tokens:
        masked_text = masked_text[:result.start] + token + masked_text[result.end:]

    def replace_pattern(pattern, entity_type, current_text, skip_func=None):
        nonlocal mapping, counters, seen_texts
        new_text = current_text
        matches = list(re.finditer(pattern, current_text))
        matches.sort(key=lambda x: x.start(), reverse=True)
        for match in matches:
            original_val = current_text[match.start():match.end()].strip()
            if re.search(r'<[A-Z_]+_\d+>', original_val):
                continue
            if skip_func and skip_func(original_val):
                continue
            seen_key = (entity_type, original_val)
            if seen_key in seen_texts:
                token = seen_texts[seen_key]
            else:
                token = f"<{entity_type}_{counters[entity_type]}>"
                seen_texts[seen_key] = token
                counters[entity_type] += 1
                mapping[token] = original_val
            new_text = new_text[:match.start()] + token + new_text[match.end():]
        return new_text

    company_pattern = (
        r'\b(?:SANTA CRUZ COUNTY REGIONAL TRANSPORTATION COMMISSION|'
        r'Santa Cruz County Regional Transportation Commission|SCCRTC|'
        r'[A-Z][A-Za-z0-9&\.\-\s]{1,45}?\b(?:Inc\.|Corp\.|Corporation|LLC|Ltd\.|LLP|Megacorp|Co\.|Enterprises|Solutions|Technologies|Group))\b'
    )
    masked_text = replace_pattern(
        company_pattern,
        "COMPANY",
        masked_text,
        lambda x: x.lower() in skip_phrases or x.lower().startswith("the ")
    )

    address_pattern = r'\b\d{1,6}\s+[A-Za-z0-9\.\-\s]{2,30}?\b(?:Blvd|Boulevard|St|Street|Ave|Avenue|Rd|Road|Ln|Lane|Dr|Drive|Way|Court|Ct|Pl|Place|Hostel|Parkway|Pkwy)\.?\b'
    masked_text = replace_pattern(address_pattern, "ADDRESS", masked_text)

    address_partial = r'\b\d{1,6}\s+[A-Z][A-Za-z0-9\s]{2,25}(?=\s*<LOCATION_)'
    masked_text = replace_pattern(address_partial, "ADDRESS", masked_text)

    zip_code_pattern = r'\b\d{5}(?:-\d{4})?\b'
    masked_text = replace_pattern(zip_code_pattern, "ZIP_CODE", masked_text)

    state_pattern = r'\b[A-Z]{2}(?=,?\s+<ZIP_CODE_|,?\s+\d{5})'
    masked_text = replace_pattern(state_pattern, "STATE", masked_text)

    return masked_text, mapping


def unmask_pii(masked_text: str, mapping: dict) -> str:
    """
    Replaces tokens in the masked text with their original values from the mapping.
    """
    unmasked_text = masked_text
    for token in sorted(mapping.keys(), key=len, reverse=True):
        unmasked_text = unmasked_text.replace(token, mapping[token])
    return unmasked_text