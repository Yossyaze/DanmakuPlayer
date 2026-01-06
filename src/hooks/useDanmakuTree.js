import { useMemo } from 'react';

/**
 * useDanmakuTree - 弾幕表示用のツリー構造を構築するカスタムフック
 *
 * サイドバー用の useCommentTree と異なり、以下の弾幕専用機能を含む：
 * - resolveTime: 子コメントが親の時刻を継承（同時表示用）
 * - 視覚スタイル: インデント、スケール、色分け
 * - layoutIndex, treeSize: 弾幕レイアウト用メタデータ
 *
 * @param {Array} sourceComments - ソースコメント配列
 * @param {boolean} enableTreeView - ツリービューが有効かどうか
 * @returns {Array} 弾幕用に処理されたコメント配列
 */
export function useDanmakuTree(sourceComments, enableTreeView) {
  return useMemo(() => {
    if (!enableTreeView || !sourceComments || sourceComments.length === 0) {
      // ツリービュー無効時でも depth=0 を設定
      return sourceComments ? sourceComments.map((c) => ({ ...c, depth: 0 })) : sourceComments;
    }

    // 1. ノードとResNumのマッピング
    const nodeMap = new Map();
    const resNumMap = new Map();

    // 変更用に浅いコピーを作成
    const nodes = sourceComments.map((c) => ({
      ...c,
      children: [],
      parentId: null,
      _originalTime: c.time,
    }));

    nodes.forEach((node) => {
      nodeMap.set(node.id, node);
      if (node.originalResNum) {
        // 優先: ファイル固有
        resNumMap.set(`${node.sourceFileId}-${node.originalResNum}`, node.id);
        // フォールバック: グローバル
        if (!resNumMap.has(node.originalResNum)) {
          resNumMap.set(node.originalResNum, node.id);
        }
      }
    });

    // 2. ツリーリンクを構築
    nodes.forEach((node) => {
      const match = node.text.match(/(?:>>|＞＞|&gt;&gt;)\s*(\d+)/);
      if (match) {
        const targetResNum = parseInt(match[1]);
        let parentId = resNumMap.get(`${node.sourceFileId}-${targetResNum}`);
        // Strict mode: グローバルフォールバックなし

        if (parentId && parentId !== node.id) {
          const parent = nodeMap.get(parentId);
          if (parent) {
            parent.children.push(node);
            node.parentId = parentId;
          }
        }
      }
    });

    // 2.5 ツリーメタデータを計算 (Root, Depth, LayoutIndex, TreeSize)
    const treeMetaMap = new Map(); // id -> { rootId, depth, layoutIndex }
    const rootSizeMap = new Map(); // rootId -> totalNodes

    // DFS でレイアウトインデックスを割り当て
    const traverseTree = (node, depth, currentRootId, indexRef) => {
      const myIndex = indexRef.current;
      indexRef.current++;

      treeMetaMap.set(node.id, {
        rootId: currentRootId,
        depth,
        layoutIndex: myIndex,
      });

      node.children.forEach((child) => {
        traverseTree(child, depth + 1, currentRootId, indexRef);
      });
    };

    // 最初のパス: メタデータを計算
    nodes
      .filter((n) => !n.parentId)
      .forEach((root) => {
        const indexRef = { current: 0 };
        traverseTree(root, 0, root.id, indexRef);
        rootSizeMap.set(root.id, indexRef.current);
      });

    // 3. 有効なタイムスタンプを割り当て（再帰）
    // サイクル検出付きの時間解決ヘルパー
    const resolveTime = (node, visited = new Set()) => {
      if (visited.has(node.id)) return node.time;
      visited.add(node.id);

      if (node.parentId) {
        const parent = nodeMap.get(node.parentId);
        if (parent) {
          return resolveTime(parent, visited);
        }
      }
      return node.time;
    };

    const processed = nodes.map((node) => {
      const newTime = resolveTime(node);
      const meta = treeMetaMap.get(node.id) || { rootId: node.id, depth: 0, layoutIndex: 0 };
      const treeSize = rootSizeMap.get(meta.rootId) || 1;

      let finalNode = {
        ...node,
        time: newTime,
        depth: meta.depth,
        rootId: meta.rootId,
        layoutIndex: meta.layoutIndex,
        treeSize: treeSize,
      };

      if (node.parentId) {
        // ツリービューの視覚的な強調
        const indentSpaces = '　'.repeat(Math.max(0, meta.depth - 1)); // 全角スペース
        finalNode.text = `${indentSpaces}└ ${finalNode.text}`;
        finalNode.style = {
          ...finalNode.style,
          transform: 'scale(0.8)',
          transformOrigin: 'center left',
        };
      } else {
        // 返信数に基づく親ノードのフォーマット
        const replyCount = node.children.length;
        if (replyCount >= 5) {
          finalNode.color = '#ff4d4d'; // 赤
        } else if (replyCount >= 1) {
          finalNode.color = '#4ade80'; // 緑
        }
      }

      return finalNode;
    });

    // 4. Debug Logging
    const rootCount = processed.filter(
      (n) => !n.rootId || n.id === n.rootId || n.layoutIndex === 0
    ).length;
    const childCount = processed.length - rootCount;
    const orphanCount = nodes.filter((n) => n.parentId && !nodeMap.has(n.parentId)).length;

    console.log(
      `[DanmakuTree] Built tree with ${rootCount} roots, ${childCount} children. Orphans: ${orphanCount}`
    );

    // 時間でソート
    return processed.sort((a, b) => a.time - b.time);
  }, [sourceComments, enableTreeView]);
}
