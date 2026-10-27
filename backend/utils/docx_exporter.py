import io
import re
import difflib
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from utils.pii_masker import unmask_pii


def build_contract_docx(contract: dict, clauses: list) -> io.BytesIO:
    """
    Generates a native Microsoft Word (.docx) document reflecting legal redlines.
    
    - Iterates clauses sorted by clause_index.
    - If a clause was flagged and defender_redline exists, writes redline diff formatting:
      * Strikethrough & Red for removed items
      * Underline & Green for inserted redlines
    - Otherwise, writes the original_text.
    - Preserves lightweight memory footprint (BytesIO) suitable for 512MB RAM limit.
    """
    doc = docx.Document()

    # Set standard 1-inch margins
    for section in doc.sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)

    filename = contract.get("filename", "Contract")
    role = contract.get("role", "Buyer")
    jurisdiction = contract.get("jurisdiction", "General")
    pii_mapping = contract.get("pii_mapping", {})

    # Document Header Title
    title_p = doc.add_paragraph()
    title_p.paragraph_format.space_before = Pt(0)
    title_p.paragraph_format.space_after = Pt(4)
    title_run = title_p.add_run("CONTRACT REVIEW & REDLINE EXPORT")
    title_run.font.name = "Calibri"
    title_run.font.size = Pt(18)
    title_run.font.bold = True
    title_run.font.color.rgb = RGBColor(30, 41, 59)

    # Metadata subtitle
    meta_p = doc.add_paragraph()
    meta_p.paragraph_format.space_after = Pt(12)
    meta_run = meta_p.add_run(
        f"File: {filename}   |   Audited For: {role}   |   Jurisdiction: {jurisdiction}"
    )
    meta_run.font.name = "Calibri"
    meta_run.font.size = Pt(10)
    meta_run.font.italic = True
    meta_run.font.color.rgb = RGBColor(100, 116, 139)

    # Redline Legend Box
    legend_p = doc.add_paragraph()
    legend_p.paragraph_format.space_after = Pt(16)
    
    legend_label = legend_p.add_run("Redline Key: ")
    legend_label.font.name = "Calibri"
    legend_label.font.size = Pt(9.5)
    legend_label.font.bold = True
    legend_label.font.color.rgb = RGBColor(71, 85, 105)

    del_label = legend_p.add_run("[Strikethrough / Red = Proposed Deletion]  ")
    del_label.font.name = "Calibri"
    del_label.font.size = Pt(9.5)
    del_label.font.strike = True
    del_label.font.color.rgb = RGBColor(192, 0, 0)

    ins_label = legend_p.add_run("[Underline / Green = Proposed Insertion]")
    ins_label.font.name = "Calibri"
    ins_label.font.size = Pt(9.5)
    ins_label.font.underline = True
    ins_label.font.color.rgb = RGBColor(0, 128, 0)

    # Divider line
    div_p = doc.add_paragraph()
    div_p.paragraph_format.space_after = Pt(14)
    div_run = div_p.add_run("—" * 60)
    div_run.font.name = "Calibri"
    div_run.font.size = Pt(9)
    div_run.font.color.rgb = RGBColor(203, 213, 225)

    # Iterate through clauses in order
    for clause in clauses:
        original_raw = clause.get("original_text", "")
        original_text = unmask_pii(original_raw, pii_mapping) if pii_mapping else original_raw

        redline_raw = clause.get("defender_redline") or clause.get("amended_text") or clause.get("final_text")
        risk_score = clause.get("risk_score", 0)
        prosecutor_flags = clause.get("prosecutor_flags") or []
        is_flagged = (risk_score > 0) or (len(prosecutor_flags) > 0)

        has_redline = bool(
            redline_raw
            and str(redline_raw).strip()
            and str(redline_raw).strip() != original_raw.strip()
        )

        p = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(12)
        p.paragraph_format.line_spacing = 1.15

        if is_flagged and has_redline:
            redline_text = unmask_pii(str(redline_raw), pii_mapping) if pii_mapping else str(redline_raw)

            orig_words = original_text.split()
            red_words = redline_text.split()

            matcher = difflib.SequenceMatcher(None, orig_words, red_words)
            for tag, i1, i2, j1, j2 in matcher.get_opcodes():
                if tag == 'equal':
                    chunk = " ".join(orig_words[i1:i2]) + " "
                    run = p.add_run(chunk)
                    run.font.name = "Calibri"
                    run.font.size = Pt(11)
                elif tag == 'delete':
                    chunk = " ".join(orig_words[i1:i2]) + " "
                    run = p.add_run(chunk)
                    run.font.name = "Calibri"
                    run.font.size = Pt(11)
                    run.font.strike = True
                    run.font.color.rgb = RGBColor(192, 0, 0)
                elif tag == 'insert':
                    chunk = " ".join(red_words[j1:j2]) + " "
                    run = p.add_run(chunk)
                    run.font.name = "Calibri"
                    run.font.size = Pt(11)
                    run.font.underline = True
                    run.font.color.rgb = RGBColor(0, 128, 0)
                elif tag == 'replace':
                    chunk_del = " ".join(orig_words[i1:i2]) + " "
                    run_del = p.add_run(chunk_del)
                    run_del.font.name = "Calibri"
                    run_del.font.size = Pt(11)
                    run_del.font.strike = True
                    run_del.font.color.rgb = RGBColor(192, 0, 0)

                    chunk_ins = " ".join(red_words[j1:j2]) + " "
                    run_ins = p.add_run(chunk_ins)
                    run_ins.font.name = "Calibri"
                    run_ins.font.size = Pt(11)
                    run_ins.font.underline = True
                    run_ins.font.color.rgb = RGBColor(0, 128, 0)
                    run_ins.font.underline = True
                    run_ins.font.color.rgb = RGBColor(0, 128, 0)
        else:
            # Unflagged / standard clause
            run = p.add_run(original_text)
            run.font.name = "Calibri"
            run.font.size = Pt(11)

    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    return buffer
