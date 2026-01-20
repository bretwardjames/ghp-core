/**
 * Issue Metadata Parsing
 *
 * Parses YAML-style frontmatter from issue content to extract
 * labels, assignees, issue type, and project field values.
 */

export interface IssueMetadata {
    labels: string[];
    assignees: string[];
    type: string | null;
    /** Project fields (key = field name, value = field value) */
    fields: Record<string, string>;
}

/**
 * Parse metadata from issue content (YAML frontmatter style).
 *
 * Format:
 * ```
 * ---
 * labels: bug, enhancement
 * assignees: user1, user2
 * type: Feature
 * status: Todo
 * priority: High
 * ---
 *
 * Issue body here...
 * ```
 *
 * Reserved keys: labels, assignees, type
 * All other keys are treated as project field names.
 *
 * @param content The full issue content (may include frontmatter)
 * @returns Parsed metadata and the remaining body content
 */
export function parseIssueMetadata(content: string): { metadata: IssueMetadata; body: string } {
    const metadata: IssueMetadata = {
        labels: [],
        assignees: [],
        type: null,
        fields: {},
    };

    // Trim leading whitespace/newlines
    const trimmed = content.trimStart();

    // Check for frontmatter block (--- at start, then ---)
    const frontmatterMatch = trimmed.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    if (!frontmatterMatch) {
        return { metadata, body: content };
    }

    const [, frontmatter, body] = frontmatterMatch;

    // Parse each line of frontmatter
    for (const line of frontmatter.split('\n')) {
        const match = line.match(/^(\w+):\s*(.+)$/);
        if (!match) continue;

        const [, key, value] = match;
        const keyLower = key.toLowerCase();

        if (keyLower === 'labels') {
            metadata.labels = value.split(',').map(l => l.trim()).filter(Boolean);
        } else if (keyLower === 'assignees') {
            metadata.assignees = value.split(',').map(a => a.trim()).filter(Boolean);
        } else if (keyLower === 'type') {
            metadata.type = value.trim();
        } else {
            // Treat as a project field (preserve original key casing for field name matching)
            metadata.fields[key] = value.trim();
        }
    }

    return { metadata, body: body.trim() };
}

/**
 * Parse CLI-style fields option (key=value,key=value format).
 *
 * @example
 * parseFieldsOption('priority=High,size=xs')
 * // => { priority: 'High', size: 'xs' }
 *
 * @param fieldsStr Comma-separated key=value pairs
 * @returns Record of field name to value
 */
export function parseFieldsOption(fieldsStr: string): Record<string, string> {
    const fields: Record<string, string> = {};
    for (const pair of fieldsStr.split(',')) {
        const [key, ...valueParts] = pair.split('=');
        if (key && valueParts.length > 0) {
            fields[key.trim()] = valueParts.join('=').trim();
        }
    }
    return fields;
}

/**
 * Merge metadata from multiple sources (CLI flags override frontmatter).
 *
 * @param fromContent Metadata parsed from issue content
 * @param fromFlags Metadata from CLI flags
 * @returns Merged metadata with flags taking precedence
 */
export function mergeMetadata(
    fromContent: IssueMetadata,
    fromFlags: Partial<IssueMetadata>
): IssueMetadata {
    return {
        labels: fromFlags.labels?.length ? fromFlags.labels : fromContent.labels,
        assignees: fromFlags.assignees?.length ? fromFlags.assignees : fromContent.assignees,
        type: fromFlags.type ?? fromContent.type,
        fields: { ...fromContent.fields, ...fromFlags.fields },
    };
}

/**
 * Generate a metadata block for the editor template.
 *
 * @param existingMetadata Optional pre-filled metadata values
 * @returns Frontmatter block string to insert in editor
 */
export function generateMetadataTemplate(existingMetadata?: Partial<IssueMetadata>): string {
    const lines = ['---'];

    if (existingMetadata?.labels?.length) {
        lines.push(`labels: ${existingMetadata.labels.join(', ')}`);
    } else {
        lines.push('labels: ');
    }

    if (existingMetadata?.assignees?.length) {
        lines.push(`assignees: ${existingMetadata.assignees.join(', ')}`);
    } else {
        lines.push('assignees: ');
    }

    if (existingMetadata?.type) {
        lines.push(`type: ${existingMetadata.type}`);
    } else {
        lines.push('type: ');
    }

    // Add any existing fields
    if (existingMetadata?.fields) {
        for (const [key, value] of Object.entries(existingMetadata.fields)) {
            lines.push(`${key}: ${value}`);
        }
    }

    lines.push('---');
    return lines.join('\n');
}
