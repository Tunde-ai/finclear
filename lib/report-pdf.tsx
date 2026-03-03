import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const EMERALD = "#059669";
const GRAY_600 = "#4b5563";
const GRAY_400 = "#9ca3af";
const GRAY_200 = "#e5e7eb";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 11,
    color: "#111827",
    lineHeight: 1.5,
  },
  header: {
    marginBottom: 24,
    borderBottom: `2px solid ${EMERALD}`,
    paddingBottom: 12,
  },
  brand: {
    fontSize: 10,
    color: EMERALD,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
    letterSpacing: 1,
  },
  title: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
    marginBottom: 4,
  },
  date: {
    fontSize: 9,
    color: GRAY_400,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: EMERALD,
    marginTop: 16,
    marginBottom: 8,
  },
  subsectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#374151",
    marginTop: 12,
    marginBottom: 6,
  },
  paragraph: {
    marginBottom: 8,
    fontSize: 11,
    lineHeight: 1.6,
  },
  bold: {
    fontFamily: "Helvetica-Bold",
  },
  bulletItem: {
    flexDirection: "row",
    marginBottom: 4,
    paddingLeft: 8,
  },
  bulletDot: {
    width: 14,
    fontSize: 11,
  },
  bulletText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 1.5,
  },
  tableContainer: {
    marginTop: 8,
    marginBottom: 12,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: `1px solid ${GRAY_200}`,
    paddingVertical: 4,
  },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottom: `2px solid ${EMERALD}`,
    paddingVertical: 4,
    backgroundColor: "#f0fdf4",
  },
  tableCell: {
    flex: 1,
    fontSize: 9,
    paddingHorizontal: 4,
    color: GRAY_600,
  },
  tableHeaderCell: {
    flex: 1,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    paddingHorizontal: 4,
    color: EMERALD,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    fontSize: 8,
    color: GRAY_400,
    textAlign: "center",
    borderTop: `1px solid ${GRAY_200}`,
    paddingTop: 8,
  },
});

function parseMarkdownToPdfElements(content: string): React.ReactNode[] {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip empty lines
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Section heading (##)
    if (line.startsWith("## ")) {
      elements.push(
        <Text key={key++} style={styles.sectionTitle}>
          {line.replace(/^## /, "").replace(/\*\*/g, "")}
        </Text>
      );
      i++;
      continue;
    }

    // Subsection heading (###)
    if (line.startsWith("### ")) {
      elements.push(
        <Text key={key++} style={styles.subsectionTitle}>
          {line.replace(/^### /, "").replace(/\*\*/g, "")}
        </Text>
      );
      i++;
      continue;
    }

    // Top-level heading (#)
    if (line.startsWith("# ")) {
      elements.push(
        <Text key={key++} style={styles.title}>
          {line.replace(/^# /, "").replace(/\*\*/g, "")}
        </Text>
      );
      i++;
      continue;
    }

    // Table (lines with pipes)
    if (line.includes("|") && line.trim().startsWith("|")) {
      const tableRows: string[][] = [];
      let j = i;
      while (j < lines.length && lines[j].includes("|") && lines[j].trim().startsWith("|")) {
        const cells = lines[j]
          .split("|")
          .filter((c) => c.trim() !== "")
          .map((c) => c.trim());
        // Skip separator rows (----, :---:, etc.)
        if (cells.every((c) => /^[-:]+$/.test(c))) {
          j++;
          continue;
        }
        tableRows.push(cells);
        j++;
      }

      if (tableRows.length > 0) {
        elements.push(
          <View key={key++} style={styles.tableContainer}>
            {tableRows.map((row, ri) => (
              <View
                key={ri}
                style={ri === 0 ? styles.tableHeaderRow : styles.tableRow}
              >
                {row.map((cell, ci) => (
                  <Text
                    key={ci}
                    style={ri === 0 ? styles.tableHeaderCell : styles.tableCell}
                  >
                    {cell.replace(/\*\*/g, "")}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        );
      }

      i = j;
      continue;
    }

    // Bullet item
    if (/^\s*[-*]\s/.test(line)) {
      const text = line.replace(/^\s*[-*]\s/, "").trim();
      elements.push(
        <View key={key++} style={styles.bulletItem}>
          <Text style={styles.bulletDot}>•</Text>
          <Text style={styles.bulletText}>{renderInlineText(text)}</Text>
        </View>
      );
      i++;
      continue;
    }

    // Numbered list
    if (/^\s*\d+\.\s/.test(line)) {
      const match = line.match(/^\s*(\d+)\.\s(.*)$/);
      if (match) {
        elements.push(
          <View key={key++} style={styles.bulletItem}>
            <Text style={styles.bulletDot}>{match[1]}.</Text>
            <Text style={styles.bulletText}>{renderInlineText(match[2])}</Text>
          </View>
        );
      }
      i++;
      continue;
    }

    // Regular paragraph
    elements.push(
      <Text key={key++} style={styles.paragraph}>
        {renderInlineText(line)}
      </Text>
    );
    i++;
  }

  return elements;
}

function renderInlineText(text: string): React.ReactNode {
  // Split by bold markers and render bold segments
  const parts = text.split(/(\*\*.*?\*\*)/g);
  if (parts.length === 1) return text;

  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <Text key={i} style={styles.bold}>
          {part.slice(2, -2)}
        </Text>
      );
    }
    return part;
  });
}

export function ReportPdfDocument({
  title,
  content,
  date,
}: {
  title: string;
  content: string;
  date: Date;
}) {
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>FINCLEAR</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.date}>Generated on {formattedDate}</Text>
        </View>

        {parseMarkdownToPdfElements(content)}

        <Text style={styles.footer} fixed>
          FinClear — AI-Powered Financial Reports — Confidential
        </Text>
      </Page>
    </Document>
  );
}
